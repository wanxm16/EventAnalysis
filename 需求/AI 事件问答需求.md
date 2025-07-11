## 业务目标

基于data 目录下的 raw_conflict.csv 的文件，实现一个 AI 的问答

AI 大模型使用 deepseek
APIkey = sk-9b31446d564c46a2b1593be7804f4376


## **1 总体架构**

```
┌──────────────┐
│  Excel 文件  │  (事件融合2.0导出.xlsx，定期上传)
└──────┬───────┘
       │① Ingestion
┌──────▼────────────────────────────────────────────┐
│ 数据层：                                         │
│ ├ DuckDB OLAP 表（结构化字段，支持 SQL & 聚合） │
│ └ 向量库（文本字段嵌入：事件描述、处置结果…）   │
└──────┬───────────────────────────────────────────┘
       │② Query Router（意图/类型判别）
┌──────▼────────────────────────────────────────────┐
│ 业务执行层：                                      │
│ ├ SQL 解析链（LLM → SQL → DuckDB）               │
│ ├ Pandas Agent（复杂后处理、时差、规则校验）     │
│ └ 向量召回链（语义检索 + RAG）                   │
└──────┬───────────────────────────────────────────┘
       │③ 结果精炼（CoT & Function Calling）
┌──────▼───────────────┐
│  GPT-4o / Claude 4   │
└──────┬───────────────┘
       │④ JSON result
┌──────▼───────────────┐
│ FastAPI 服务层       │
└────────┬────────────┘
         │ REST / WebSocket
      ┌──▼───┐
      │ UI   │（Chat 或 BI 控制台）
      └──────┘
```

### **核心思想**

1. **结构化强 → SQL；语义弱 → 向量检索**
   查询路由器先根据关键词/模式将 Query 分类：
   * *统计 / 过滤 / 聚合* → **SQLDatabaseChain**
   * *关键词 / 情感 / 摘要* → **RAG Chain**
2. **统一用 LLM 进行“答案润色 + 中文输出 + Chain-of-Thought 推理”** **，但所有 ** **数值计算在本地完成** **，避免幻觉。**
3. **零依赖数据库安装**：DuckDB 嵌入式 + Parquet | CSV，可快速加载 Excel 并支持高效窗口函数。

---

## **2 数据准备流程**

| **步骤**   | **关键动作**                                                         | **关键技术 / 库** |
| ---------------- | -------------------------------------------------------------------------- | ----------------------- |
| ① 解析 Excel    | **pandas.read_excel**读取所有 Sheet -> DataFrame                     | pandas                  |
| ② 字段清洗      | • 日期列统一转 UTC• 枚举映射表（事件级别、二级分类…）• 缺失值填补/标志 | pandas                  |
| ③ 入库 (结构化) | con.execute("CREATE OR REPLACE TABLE events AS SELECT * FROM df")          | DuckDB                  |
| ④ 生成文本块    | **将**事件描述 + 处置结果 + 镇街等关键字段**拼成文档字符串**   | pandas                  |
| ⑤ 嵌入 & 向量化 | OpenAIEmbeddings**/**Instructor-XL**→ 保存到 FAISS 或**pgvector     | LangChain, FAISS        |
| ⑥ 元数据登记    | 把表 schema、枚举值、指标定义写入 JSON / YAML，供 LLM Function 调用        | custom                  |

> **增量更新**：监听上传目录或用 Airflow 定时任务；Excel hash 变动后自动触发①–⑤，只对新增/变更行做 UPSERT。

---

## **3 查询执行链**

### **3.1 Query Router（轻量 Prompt + 正则）**

```
def route(query):
    if re.search(r"(多少|几条|比例|平均|耗时|排名|TOP)", query):
        return "sql"
    if re.search(r"(包含|提到|谢谢|满意|关键词|案例|总结)", query):
        return "rag"
    return "sql"  # 默认
```

 *生产可用* ：替换成 **LLM Classifier** (e.g., GPT-4o function) + **信号特征**（时间差计算需 SQL/Pandas 等）。

### **3.2 SQLDatabaseChain**

1. **Schema Reflection**

```
from langchain.sql_database import SQLDatabase
db = SQLDatabase.from_uri("duckdb:///events.db")
```

1. 
2. **LLM + Function Calling** 生成安全 SQL（带 **LIMIT 200** 防炸库）。
3. **执行结果** 回传给 LLM 进行解释／翻译，并附加缓存（**@st.cache_data**）。

### **3.3 Pandas Agent**

某些 Query 需二次处理：

* **办理时长** = 办结时间 - 上报时间
* **逾期告警** = 时长 > 24 h
  利用 LangChain **Pandas DataFrame Agent**，让 LLM 先写 Python 代码块，执行后返回 JSON，再让 LLM 生成中文总结。

### **3.4 向量召回链 (RAG)**

```
retriever = VectorStoreRetriever(
    vectorstore=faiss_index,
    search_kwargs={"k":6}
)
rag_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o-mini"),
    chain_type="stuff",
    retriever=retriever
)
```

* **stuff** 链可替换为 **map_reduce** 以应对长文本。
* 召回结果再交给 LLM 做 Bullet → 中文段落归纳、情感计数等。

---

## **4 LLM 提示工程**

### **4.1 系统 Prompt（示意）**

```
你是海曙区“事件融合2.0”数据分析员。
返回 **精确数值** 时必须来自 SQL/Pandas 计算结果，不可编造。
回答请用简洁中文，必要时附表格或 Markdown 列表。
```

### **4.2 Function Schema**

```
{
  "name": "run_sql",
  "description": "执行 SQL 并返回 JSON",
  "parameters": {
    "type": "object",
    "properties": {
      "sql": {"type":"string"}
    },
    "required": ["sql"]
  }
}
```

---

## **5 API / 部署**

| **层** | **技术选型**         | **说明**                             |
| ------------ | -------------------------- | ------------------------------------------ |
| Web 服务     | **FastAPI**+ Uvicorn | /chat**、**/upload**、**/refresh     |
| 鉴权         | JWT (Auth0 / Keycloak)     | 控制谁能查内部事件                         |
| 日志         | loguru + Prometheus        | 查询耗时、错误码、LLM token                |
| 容器         | Docker Compose             | openai-proxy、duckdb-server、faiss-service |
| CI/CD        | GitHub Actions             | 单元测试：40 条 Query 回归 > 95% 通过      |

---

## **6 评测与迭代**

1. **基准集**：刚才那 40 条 Query → 断言脚本 (pytest)。
2. **指标** **：**

* **准确率** ≥ 0.9（关键信息匹配）
* **响应时间** < 3 s（本地 50 万行数据量级）

1. **A/B**：切换不同 LLM / RoutIng 策略 → 看准确率 + 成本。

---
