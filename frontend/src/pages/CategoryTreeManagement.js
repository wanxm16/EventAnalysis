import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Typography,
  Empty,
  Dropdown,
  Row,
  Col,
  Badge,
  List,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  RightOutlined,
  SearchOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import fewShotMetadata from '../data/few_shot_metadata.json';

const { Title, Text } = Typography;
const { TextArea, Search } = Input;

// 基层智治预定义分类树数据
const GRASSROOTS_GOVERNANCE_TREE_DATA = {
  "交通安全": ["不文明交通行为", "交通事故", "交通附属设施", "公用设施", "其他交通安全问题", "占用、堵塞、封闭消防通道、消防登高场地", "机动车路面违停", "突发事件", "街面秩序", "道路安全问题"],
  "社区服务": ["便民服务", "其他社区服务", "社区志愿者工作", "社区活动"],
  "消防安全": ["三合一场所", "作业场所（工地）安全隐患", "储存危险物品", "其他城市管理问题", "其他治安隐患", "其他消防安全隐患", "出租房人员隐患", "出租房设施安全问题", "占用、堵塞、封闭消防通道、消防登高场地", "安全出口指示灯破损、脱落、缺失", "机动车路面违停", "消防控制室相关问题", "消防设施(消火栓、取水栓）", "消防隐患纠纷", "火灾事故", "灭火器材问题", "电力设施着火", "电动车违规充电", "电气线路问题（私拉乱接、老化裸露）", "电瓶车楼道内违规停放", "行业应急", "街面秩序", "记录表更新问题", "邻里纠纷"],
  "城市管理": ["不文明交通行为", "交通事故纠纷", "交通附属设施", "作业场所（工地）安全隐患", "公共秩序纠纷", "公用设施", "其他", "其他卫生健康问题", "其他城市管理问题", "其他治安隐患", "其他消防安全隐患", "占用、堵塞、封闭消防通道、消防登高场地", "咨询解答（城市管理类）", "噪声污染", "园林绿化", "外来人口未登记暂住证", "宣传广告", "市容环境", "废弃车辆（僵尸车）", "损害赔偿纠纷", "擅自改建、占用物业共用部位", "施工管理", "机动车路面违停", "物业管理纠纷", "疫情线索", "监控设备异常", "突发事件", "综合拉练", "街面秩序", "道路安全问题", "防疫活动"],
  "矛盾纠纷": ["不正当竞争", "交通事故纠纷", "债务纠纷", "公共秩序纠纷", "其他", "其他纠纷", "劳动人事（就业）纠纷", "医疗纠纷", "口角琐事纠纷", "噪声污染", "土地森林草场水利等纠纷", "家庭婚姻纠纷", "工程施工纠纷", "征地拆迁纠纷", "情感纠纷", "房地产纠纷", "损害赔偿纠纷", "治安隐患纠纷", "消费纠纷", "消防隐患纠纷", "涉校园纠纷", "物业管理纠纷", "狗患纠纷", "环保纠纷", "经济纠纷", "街面秩序", "邻里纠纷", "金融纠纷"],
  "食药安全": ["其他食药安全问题", "农贸市场问题", "操作人员健康证问题", "非法保健品推销", "食品卫生问题", "食品安全宣传、排查", "食药无证经营", "食药生产经营、销售场所环境卫生问题"],
  "专项工作": ["综合拉练", "行业拉练"],
  "治安隐患": ["其他治安隐患", "出租房人员隐患", "外来人口未登记暂住证", "家庭暴力", "损害赔偿纠纷", "有安全隐患的群众性活动", "狗患纠纷/狗患问题", "监控设备异常", "突发事件", "管控人员异动", "街面秩序", "诈骗类", "违法犯罪线索", "防溺水"],
  "其他": ["其他"],
  "困难救助": ["其他困难救助", "家庭异动求助类", "次生问题", "生活困难救助类", "社区（村落）内涝", "综合拉练", "非警务应急求助类"],
  "农林水利": ["其他农林问题", "农林水利设施", "水利管理"],
  "自然灾害": ["其他自然灾害问题", "次生问题", "水利管理", "灾害应急处置", "社区（村落）内涝"],
  "政务代办": ["企业服务", "其他政务代办", "咨询投诉与意见建议", "手续代办"],
  "生态环境": ["其他污染", "其他消防安全隐患", "其他生态环境问题", "再生资源回收", "噪声污染", "固体废物污染", "水体污染", "水利管理", "空气污染"],
  "安全生产": ["企业安全生产资质不全", "作业场所（工地）安全隐患", "其他安全生产问题", "危化品隐患", "安全生产隐患（线索）", "特种设备隐患", "电气线路问题（私拉乱接、老化裸露）", "违规上岗", "重大危险源"],
  "文教体育": ["健身设施", "其他文教体育问题"],
  "党建宣传": ["党员志愿活动", "其他党建工作", "好人好事", "政策宣传"],
  "扫黄打非": ["其他扫黄打非事件", "诈骗类", "非法涉黄出版物"],
  "信访维稳": ["信访人员异动", "其他维稳事件", "工程施工纠纷", "损害赔偿纠纷", "物业管理纠纷", "特殊人员动态", "邻里纠纷", "重点青少年动态信息等", "金融纠纷", "非正常上访"],
  "妇联工作": ["其他妇联工作事件", "妇联服务"],
  "卫生健康": ["其他卫生健康问题"],
  "金融监管": ["其他金融监管问题", "贷款问题"],
  "工商监管": ["不正当竞争", "室内无证无照经营", "室外无证无照经营", "消费问题"],
  "治危拆违": ["危房与改建", "墙体塌方", "次生问题", "违法搭建", "邻里纠纷"],
  "协商议事": ["居民群众集体协商活动", "社情民意"],
  "工会工作": ["其他工会事件"],
  "优抚安置": ["其他涉军权益保护类问题"],
  "应急处置": ["行业应急"],
  "老龄殡葬": ["老龄殡葬服务类"]
};

// 将基层智治数据转换为树结构
const convertGrassrootsDataToTree = () => {
  let nodeIdCounter = 1;
  const tree = [];

  Object.entries(GRASSROOTS_GOVERNANCE_TREE_DATA).forEach(([category, subcategories]) => {
    const categoryNode = {
      id: `grassroots_cat_${nodeIdCounter++}`,
      name: category,
      level: 1,
      children: subcategories.map(sub => ({
        id: `grassroots_sub_${nodeIdCounter++}`,
        name: sub,
        level: 2,
        children: []
      }))
    };
    tree.push(categoryNode);
  });

  return tree;
};

// 基层智治预定义分类树
const PREDEFINED_GRASSROOTS_TREE = {
  id: 'grassroots_governance',
  name: '基层智治',
  description: '基层智治事件分类体系，包含交通安全、社区服务、消防安全等30个一级分类',
  node_count: Object.entries(GRASSROOTS_GOVERNANCE_TREE_DATA).reduce((sum, [_, subs]) => sum + 1 + subs.length, 0),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  tree: convertGrassrootsDataToTree(),
  is_predefined: true
};

// API 方法
const categoryTreeAPI = {
  getAll: () => fetch('http://localhost:8000/api/classify/category-trees').then(res => res.json()),
  getById: (treeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`).then(res => res.json()),
  create: (payload) => fetch('http://localhost:8000/api/classify/category-trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  update: (treeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  delete: (treeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}`, {
    method: 'DELETE'
  }).then(res => res.json()),
  addNode: (treeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  updateNode: (treeId, nodeId, payload) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes/${nodeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json()),
  deleteNode: (treeId, nodeId) => fetch(`http://localhost:8000/api/classify/category-trees/${treeId}/nodes/${nodeId}`, {
    method: 'DELETE'
  }).then(res => res.json()),
};

function CategoryTreeManagement() {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTree, setSelectedTree] = useState(null);
  const [selectedLevel1Node, setSelectedLevel1Node] = useState(null);
  const [selectedLevel2Node, setSelectedLevel2Node] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [treeModalVisible, setTreeModalVisible] = useState(false);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [editingTree, setEditingTree] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editingParentNode, setEditingParentNode] = useState(null);
  const [fewShotModalVisible, setFewShotModalVisible] = useState(false);
  const [selectedNodeForFewShot, setSelectedNodeForFewShot] = useState(null);
  const [fewShotExamples, setFewShotExamples] = useState([]);
  const [treeForm] = Form.useForm();
  const [nodeForm] = Form.useForm();

  useEffect(() => {
    loadTrees();
  }, []);

  const loadTrees = async () => {
    setLoading(true);
    try {
      const response = await categoryTreeAPI.getAll();
      const backendTrees = response.trees || [];
      setTrees([PREDEFINED_GRASSROOTS_TREE, ...backendTrees]);
      // 默认选中第一个树
      if (!selectedTree) {
        setSelectedTree(PREDEFINED_GRASSROOTS_TREE);
      }
    } catch (error) {
      console.error('加载分类树失败:', error);
      setTrees([PREDEFINED_GRASSROOTS_TREE]);
      if (!selectedTree) {
        setSelectedTree(PREDEFINED_GRASSROOTS_TREE);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTree = async (tree) => {
    try {
      if (tree.id === 'grassroots_governance') {
        setSelectedTree(PREDEFINED_GRASSROOTS_TREE);
      } else {
        const fullTree = await categoryTreeAPI.getById(tree.id);
        setSelectedTree(fullTree);
      }
      setSelectedLevel1Node(null);
      setSelectedLevel2Node(null);
    } catch (error) {
      message.error('加载分类树失败');
    }
  };

  const handleSelectLevel1 = (node) => {
    setSelectedLevel1Node(node);
    setSelectedLevel2Node(null);
  };

  const handleSelectLevel2 = async (node) => {
    setSelectedLevel2Node(node);

    // 如果该节点没有子节点，自动加载 few-shot 示例
    const hasChildren = node.children && node.children.length > 0;
    if (!hasChildren) {
      const fewShotCount = getFewShotCount(node.name);
      if (fewShotCount > 0) {
        // 加载 few-shot 数据
        try {
          const response = await fetch('/few_shot_examples.json');
          const data = await response.json();
          const examples = data[node.name] || [];
          setFewShotExamples(examples);
        } catch (error) {
          console.error('加载 Few-Shot 示例失败', error);
          setFewShotExamples([]);
        }
      } else {
        setFewShotExamples([]);
      }
    } else {
      setFewShotExamples([]);
    }
  };

  const getFilteredLevel1Nodes = () => {
    if (!selectedTree) return [];
    const nodes = selectedTree.tree || [];
    if (!searchText) return nodes;
    return nodes.filter(node => node.name.includes(searchText));
  };

  const getLevel2Nodes = () => {
    if (!selectedLevel1Node) return [];
    return selectedLevel1Node.children || [];
  };

  const getLevel3Nodes = () => {
    if (!selectedLevel2Node) return [];
    return selectedLevel2Node.children || [];
  };

  const handleCreateTree = () => {
    setEditingTree(null);
    treeForm.resetFields();
    setTreeModalVisible(true);
  };

  const handleEditTree = (tree) => {
    setEditingTree(tree);
    treeForm.setFieldsValue({
      name: tree.name,
      description: tree.description
    });
    setTreeModalVisible(true);
  };

  const handleDeleteTree = async (treeId) => {
    try {
      await categoryTreeAPI.delete(treeId);
      message.success('分类树已删除');
      loadTrees();
      if (selectedTree?.id === treeId) {
        setSelectedTree(null);
        setSelectedLevel1Node(null);
        setSelectedLevel2Node(null);
      }
    } catch (error) {
      message.error('删除分类树失败');
    }
  };

  const handleTreeSubmit = async () => {
    try {
      const values = await treeForm.validateFields();

      if (editingTree) {
        await categoryTreeAPI.update(editingTree.id, values);
        message.success('分类树更新成功');
      } else {
        await categoryTreeAPI.create(values);
        message.success('分类树创建成功');
      }

      setTreeModalVisible(false);
      treeForm.resetFields();
      loadTrees();
    } catch (error) {
      if (!error.errorFields) {
        message.error(editingTree ? '更新失败' : '创建失败');
      }
    }
  };

  const handleAddNode = (level, parentNode = null) => {
    if (selectedTree?.is_predefined) {
      message.warning('预定义分类树不支持编辑');
      return;
    }

    setEditingNode(null);
    setEditingParentNode(parentNode);
    nodeForm.resetFields();
    setNodeModalVisible(true);
  };

  const handleEditNode = (node) => {
    if (selectedTree?.is_predefined) {
      message.warning('预定义分类树不支持编辑');
      return;
    }

    setEditingNode(node);
    setEditingParentNode(null);
    nodeForm.setFieldsValue({ name: node.name });
    setNodeModalVisible(true);
  };

  const handleDeleteNode = async (node) => {
    if (selectedTree?.is_predefined) {
      message.warning('预定义分类树不支持编辑');
      return;
    }

    try {
      await categoryTreeAPI.deleteNode(selectedTree.id, node.id);
      message.success('节点已删除');
      const updatedTree = await categoryTreeAPI.getById(selectedTree.id);
      setSelectedTree(updatedTree);

      // 更新选中状态
      if (node.level === 1) {
        setSelectedLevel1Node(null);
        setSelectedLevel2Node(null);
      } else if (node.level === 2) {
        setSelectedLevel2Node(null);
      }

      loadTrees();
    } catch (error) {
      message.error('删除节点失败');
    }
  };

  const handleNodeSubmit = async () => {
    try {
      const values = await nodeForm.validateFields();

      if (editingNode) {
        await categoryTreeAPI.updateNode(selectedTree.id, editingNode.id, values);
        message.success('节点更新成功');
      } else {
        await categoryTreeAPI.addNode(selectedTree.id, {
          name: values.name,
          parent_id: editingParentNode?.id || null
        });
        message.success('节点添加成功');
      }

      setNodeModalVisible(false);
      nodeForm.resetFields();

      const updatedTree = await categoryTreeAPI.getById(selectedTree.id);
      setSelectedTree(updatedTree);
      loadTrees();
    } catch (error) {
      if (!error.errorFields) {
        message.error(editingNode ? '更新失败' : '添加失败');
      }
    }
  };

  // 获取节点的 few-shot 示例数量
  const getFewShotCount = (nodeName) => {
    const metadata = fewShotMetadata[nodeName];
    return metadata ? metadata.count : 0;
  };

  // 查看 few-shot 示例
  const handleViewFewShot = async (node, e) => {
    e.stopPropagation();
    setSelectedNodeForFewShot(node);
    setFewShotModalVisible(true);

    // 动态加载完整的 few-shot 数据
    try {
      const response = await fetch('/few_shot_examples.json');
      const data = await response.json();
      const examples = data[node.name] || [];
      setFewShotExamples(examples);
    } catch (error) {
      message.error('加载 Few-Shot 示例失败');
      setFewShotExamples([]);
    }
  };

  const renderNodeCard = (node, isSelected, onSelect, level) => {
    const hasChildren = node.children && node.children.length > 0;
    const isPredefined = selectedTree?.is_predefined;
    const fewShotCount = getFewShotCount(node.name);

    const menuItems = isPredefined ? [] : [
      {
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />,
        onClick: () => handleEditNode(node)
      },
      hasChildren && node.level < 3 ? {
        key: 'add',
        label: '添加子节点',
        icon: <PlusOutlined />,
        onClick: () => handleAddNode(level + 1, node)
      } : null,
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: '确认删除',
            content: '确认删除此节点及其所有子节点吗？',
            onOk: () => handleDeleteNode(node)
          });
        }
      }
    ].filter(Boolean);

    return (
      <Card
        key={node.id}
        hoverable
        style={{
          marginBottom: 8,
          backgroundColor: isSelected ? '#e6f7ff' : '#fff',
          borderColor: isSelected ? '#1890ff' : '#d9d9d9'
        }}
        onClick={() => onSelect(node)}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            {hasChildren ? (
              <FolderOpenOutlined style={{ fontSize: 18, color: '#faad14' }} />
            ) : (
              <FolderOutlined style={{ fontSize: 18, color: '#d9d9d9' }} />
            )}
            <div>
              <Text strong style={{ fontSize: 13 }}>{node.name}</Text>
              {hasChildren && (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  ({node.children.length})
                </Text>
              )}
            </div>
          </Space>
          <Space>
            <Tag color={node.level === 1 ? 'blue' : node.level === 2 ? 'green' : 'orange'} style={{ fontSize: 11, margin: 0 }}>
              {node.level}级
            </Tag>
            {fewShotCount > 0 && (
              <Badge
                count={fewShotCount}
                style={{ backgroundColor: '#52c41a' }}
                title={`${fewShotCount} 个 Few-Shot 示例`}
              />
            )}
            {hasChildren && <RightOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
            {!isPredefined && menuItems.length > 0 && (
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  size="small"
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            )}
          </Space>
        </div>
      </Card>
    );
  };

  const renderTreeSelector = () => {
    if (trees.length <= 1) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ marginRight: 8 }}>选择分类树：</Text>
        <Space>
          {trees.map(tree => (
            <Button
              key={tree.id}
              type={selectedTree?.id === tree.id ? 'primary' : 'default'}
              size="small"
              onClick={() => handleSelectTree(tree)}
            >
              {tree.name}
            </Button>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreateTree}
          >
            新建分类树
          </Button>
        </Space>
      </div>
    );
  };

  const renderColumnHeader = (title, level, count, showFewShot = false) => {
    const isPredefined = selectedTree?.is_predefined;

    return (
      <div style={{
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Title level={5} style={{ margin: 0 }}>{title}</Title>
          {count !== undefined && (
            <Text type="secondary" style={{ fontSize: 12 }}>({count})</Text>
          )}
        </Space>
        {!isPredefined && (
          showFewShot ? (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => message.info('添加 Few-Shot 示例功能开发中')}
            >
              添加 Few-Shot
            </Button>
          ) : (
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddNode(level, level === 2 ? selectedLevel1Node : level === 3 ? selectedLevel2Node : null)}
            >
              添加节点
            </Button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">分类树管理</h1>
      </div>

      <div style={{ background: '#fff', padding: '24px', minHeight: 'calc(100vh - 200px)' }}>
        {renderTreeSelector()}

        {selectedTree && (
          <>
            {/* 搜索框 */}
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="请输入特征名称"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                prefix={<SearchOutlined />}
              />
            </div>

            {/* 三列布局 */}
            <Row gutter={16}>
              {/* 第一列：一级分类 */}
              <Col span={6}>
                {renderColumnHeader(
                  selectedTree.name,
                  1,
                  getFilteredLevel1Nodes().length
                )}
                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                  {getFilteredLevel1Nodes().length === 0 ? (
                    <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    getFilteredLevel1Nodes().map(node =>
                      renderNodeCard(
                        node,
                        selectedLevel1Node?.id === node.id,
                        handleSelectLevel1,
                        1
                      )
                    )
                  )}
                </div>
              </Col>

              {/* 第二列：二级分类 */}
              <Col span={6}>
                {renderColumnHeader(
                  selectedLevel1Node?.name || '请选择一级分类',
                  2,
                  selectedLevel1Node ? getLevel2Nodes().length : undefined
                )}
                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                  {!selectedLevel1Node ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                      <Text type="secondary">请从左侧选择一级分类</Text>
                    </div>
                  ) : getLevel2Nodes().length === 0 ? (
                    <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    getLevel2Nodes().map(node =>
                      renderNodeCard(
                        node,
                        selectedLevel2Node?.id === node.id,
                        handleSelectLevel2,
                        2
                      )
                    )
                  )}
                </div>
              </Col>

              {/* 第三列：三级分类 或 Few-Shot 示例 */}
              <Col span={12}>
                {renderColumnHeader(
                  selectedLevel2Node?.name || '请选择二级分类',
                  3,
                  selectedLevel2Node ? (getLevel3Nodes().length > 0 ? getLevel3Nodes().length : fewShotExamples.length) : undefined,
                  selectedLevel2Node && getLevel3Nodes().length === 0 && fewShotExamples.length > 0
                )}
                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                  {!selectedLevel2Node ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                      <Text type="secondary">请从左侧选择二级分类</Text>
                    </div>
                  ) : getLevel3Nodes().length > 0 ? (
                    // 有三级分类，显示三级分类
                    getLevel3Nodes().map(node =>
                      renderNodeCard(
                        node,
                        false,
                        () => {},
                        3
                      )
                    )
                  ) : fewShotExamples.length > 0 ? (
                    // 没有三级分类但有 few-shot 示例，显示 few-shot
                    <div>
                      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 4 }}>
                        <Space>
                          <FileTextOutlined style={{ color: '#1890ff' }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            共 {fewShotExamples.length} 个 Few-Shot 示例
                          </Text>
                        </Space>
                      </div>
                      {fewShotExamples.slice(0, 10).map((item, index) => (
                        <Card
                          key={index}
                          size="small"
                          style={{ marginBottom: 8 }}
                          hoverable
                          bodyStyle={{ padding: '12px' }}
                        >
                          <Space direction="vertical" style={{ width: '100%' }} size="small">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong style={{ fontSize: 12 }}>示例 #{index + 1}</Text>
                              <Tag color="green" style={{ margin: 0 }}>{item.二级分类}</Tag>
                            </div>
                            <Text
                              style={{
                                fontSize: 13,
                                color: '#555',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {item.事件描述}
                            </Text>
                            <Space size="small" style={{ fontSize: 11 }}>
                              <Tag color="blue">{item.事件类型}</Tag>
                              <Text type="secondary">{item.区县名称}</Text>
                              <Text type="secondary">{item.镇街名称}</Text>
                            </Space>
                          </Space>
                        </Card>
                      ))}
                      {fewShotExamples.length > 10 && (
                        <div style={{ textAlign: 'center', padding: 12 }}>
                          <Button
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => {
                              setSelectedNodeForFewShot(selectedLevel2Node);
                              setFewShotModalVisible(true);
                            }}
                          >
                            查看全部 {fewShotExamples.length} 个示例
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 既没有三级分类也没有 few-shot
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                      <Text type="secondary">暂无数据</Text>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </>
        )}
      </div>

      {/* 创建/编辑分类树模态框 */}
      <Modal
        title={editingTree ? '编辑分类树' : '创建分类树'}
        open={treeModalVisible}
        onOk={handleTreeSubmit}
        onCancel={() => {
          setTreeModalVisible(false);
          treeForm.resetFields();
        }}
        width={600}
      >
        <Form form={treeForm} layout="vertical">
          <Form.Item
            label="分类树名称"
            name="name"
            rules={[{ required: true, message: '请输入分类树名称' }]}
          >
            <Input placeholder="例如：81890的分类" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="简要描述这个分类树的用途" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加/编辑节点模态框 */}
      <Modal
        title={editingNode ? '编辑节点' : '添加节点'}
        open={nodeModalVisible}
        onOk={handleNodeSubmit}
        onCancel={() => {
          setNodeModalVisible(false);
          nodeForm.resetFields();
        }}
        width={500}
      >
        {editingParentNode && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
            <Text type="secondary">父节点：</Text>
            <Text strong>{editingParentNode.name}</Text>
          </div>
        )}
        <Form form={nodeForm} layout="vertical">
          <Form.Item
            label="节点名称"
            name="name"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="请输入节点名称" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Few-Shot 示例查看模态框 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Few-Shot 示例</span>
            {selectedNodeForFewShot && (
              <Tag color="blue">{selectedNodeForFewShot.name}</Tag>
            )}
          </Space>
        }
        open={fewShotModalVisible}
        onCancel={() => {
          setFewShotModalVisible(false);
          setSelectedNodeForFewShot(null);
          setFewShotExamples([]);
        }}
        width={900}
        footer={[
          <Button key="close" onClick={() => {
            setFewShotModalVisible(false);
            setSelectedNodeForFewShot(null);
            setFewShotExamples([]);
          }}>
            关闭
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            共 {fewShotExamples.length} 个示例，可用于模型训练和分类参考
          </Text>
        </div>
        <List
          dataSource={fewShotExamples}
          loading={fewShotExamples.length === 0}
          locale={{ emptyText: '暂无 Few-Shot 示例' }}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个示例`
          }}
          renderItem={(item, index) => (
            <List.Item key={index}>
              <Card
                size="small"
                style={{ width: '100%' }}
                title={
                  <Space>
                    <Text strong>示例 #{index + 1}</Text>
                    <Tag color="green">{item.二级分类}</Tag>
                  </Space>
                }
              >
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="事件描述">
                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                      {item.事件描述}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="事件类型">
                    <Tag color="blue">{item.事件类型}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="区县">
                    {item.区县名称}
                  </Descriptions.Item>
                  <Descriptions.Item label="镇街">
                    {item.镇街名称}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}

export default CategoryTreeManagement;
