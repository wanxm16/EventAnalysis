#!/usr/bin/env python3
"""
AI问答系统完整测试脚本
包含基础功能测试和高级业务场景测试
"""

import requests
import yaml
import time
import sys
import os
from collections import defaultdict
from rich import print
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

API_URL = "http://localhost:8000/api/chat"

def run_test_case(question, expected_keywords, category="unknown"):
    """运行单个测试用例"""
    try:
        resp = requests.post(API_URL, json={"message": question}, timeout=45)
        if resp.status_code != 200:
            return False, f"[red]❌ HTTP {resp.status_code}[/red]", "", category

        data = resp.json()
        answer = data.get("message", "")
        if not answer:
            return False, "[yellow]⚠️ Empty answer[/yellow]", "", category

        # 检查是否成功
        if not data.get("success", False):
            return False, f"[red]❌ API错误: {answer}[/red]", answer, category

        # 检查关键词（根据类别调整严格程度）
        missing_keywords = []
        for keyword in expected_keywords:
            if keyword not in answer:
                missing_keywords.append(keyword)

        # 对于高级查询，允许更宽松的匹配
        is_advanced = category in ["具体事件", "统计分析", "时间序列", "时效分析", 
                                 "状态查询", "高级文本搜索", "地区专项", "字段分析",
                                 "部门分析", "人员分析", "数据质量", "一致性检查",
                                 "对比分析", "深度分析", "高级对比", "总结分析",
                                 "异常检查", "模板查询", "排行榜", "比例计算",
                                 "满意度", "复合条件"]

        if missing_keywords:
            if is_advanced and len(missing_keywords) < len(expected_keywords):
                return True, f"[yellow]⚠️ 部分通过 (缺失: {', '.join(missing_keywords)})[/yellow]", answer, category
            else:
                return False, f"[red]❌ 缺失关键词: {', '.join(missing_keywords)}[/red]", answer, category

        return True, "[green]✅ Passed[/green]", answer, category

    except Exception as e:
        return False, f"[red]❌ Exception: {e}[/red]", "", category

def run_all_tests(yaml_path="test/all_queries.yaml"):
    """运行所有测试用例"""
    
    # 检查文件是否存在
    if not os.path.exists(yaml_path):
        console.print(f"[red]❌ 测试文件不存在: {yaml_path}[/red]")
        return False
    
    # 加载测试用例
    try:
        with open(yaml_path, encoding="utf-8") as f:
            test_cases = yaml.safe_load(f)
    except Exception as e:
        console.print(f"[red]❌ 加载测试文件失败: {e}[/red]")
        return False

    if not test_cases:
        console.print("[yellow]⚠️ 测试文件为空[/yellow]")
        return False

    console.print(f"[bold cyan]🚀 开始完整测试，共加载测试用例 {len(test_cases)} 条[/bold cyan]\n")
    
    # 检查API连接
    try:
        health_resp = requests.get("http://localhost:8000/api/chat/health", timeout=5)
        if health_resp.status_code == 200:
            health_data = health_resp.json()
            if health_data.get("status") == "healthy":
                console.print("[green]✅ API服务连接正常[/green]")
            else:
                console.print(f"[yellow]⚠️ API状态异常: {health_data.get('message')}[/yellow]")
        else:
            console.print(f"[red]❌ API健康检查失败: HTTP {health_resp.status_code}[/red]")
            return False
    except Exception as e:
        console.print(f"[red]❌ 无法连接到API服务: {e}[/red]")
        return False

    console.print()
    
    # 运行测试
    pass_count = 0
    partial_pass_count = 0
    failed_cases = []
    category_stats = defaultdict(lambda: {"total": 0, "passed": 0, "partial": 0, "failed": 0})

    # 先显示测试概览
    categories = {}
    for case in test_cases:
        category = case.get("category", "unknown")
        if category not in categories:
            categories[category] = 0
        categories[category] += 1

    console.print("[bold]📊 测试用例分布:[/bold]")
    for category, count in categories.items():
        console.print(f"   • {category}: {count} 条")
    console.print()

    for i, case in enumerate(test_cases, 1):
        q = case["q"]
        expected = case["expect_contains"]
        category = case.get("category", "unknown")
        
        category_stats[category]["total"] += 1
        
        console.print(f"[blue]#{i:2d}[/blue] [dim]({category})[/dim] [bold]Q:[/bold] {q}")
        
        # 运行测试
        ok, msg, answer, test_category = run_test_case(q, expected, category)
        
        # 记录结果
        if ok:
            if "部分通过" in msg:
                partial_pass_count += 1
                category_stats[category]["partial"] += 1
            else:
                pass_count += 1
                category_stats[category]["passed"] += 1
            console.print(f"     ➜ {msg}")
            if len(answer) > 150:
                console.print(f"     [dim]回答: {answer[:150]}...[/dim]")
            else:
                console.print(f"     [dim]回答: {answer}[/dim]")
        else:
            failed_cases.append({
                "id": i,
                "question": q,
                "expected": expected,
                "result": msg,
                "answer": answer,
                "category": category
            })
            category_stats[category]["failed"] += 1
            console.print(f"     ➜ {msg}")
            if answer:
                console.print(f"     [dim]实际回答: {answer[:200]}...[/dim]")
        
        console.print()
        
        # 动态间隔，高级查询需要更多时间
        if category in ["高级对比", "复合条件", "总结分析"]:
            time.sleep(2)
        else:
            time.sleep(1)

    # 显示汇总结果
    console.print("=" * 90)
    total_success = pass_count + partial_pass_count
    success_rate = total_success / len(test_cases) * 100
    
    console.print(f"[bold cyan]📊 完整测试结果: {total_success} / {len(test_cases)} 通过 ({success_rate:.1f}%)[/bold cyan]")
    console.print(f"   • [green]完全通过: {pass_count}[/green]")
    console.print(f"   • [yellow]部分通过: {partial_pass_count}[/yellow]")
    console.print(f"   • [red]失败: {len(failed_cases)}[/red]")
    
    # 分类统计表格
    console.print(f"\n[bold]📈 分类测试统计:[/bold]")
    
    stats_table = Table(show_header=True, header_style="bold cyan")
    stats_table.add_column("类别", style="white", width=20)
    stats_table.add_column("总数", justify="center", width=6)
    stats_table.add_column("通过", justify="center", width=6, style="green")
    stats_table.add_column("部分", justify="center", width=6, style="yellow")
    stats_table.add_column("失败", justify="center", width=6, style="red")
    stats_table.add_column("成功率", justify="center", width=8)
    
    for category, stats in sorted(category_stats.items()):
        success_count = stats["passed"] + stats["partial"]
        rate = success_count / stats["total"] * 100 if stats["total"] > 0 else 0
        rate_style = "green" if rate >= 80 else "yellow" if rate >= 60 else "red"
        
        stats_table.add_row(
            category,
            str(stats["total"]),
            str(stats["passed"]),
            str(stats["partial"]),
            str(stats["failed"]),
            f"[{rate_style}]{rate:.1f}%[/{rate_style}]"
        )
    
    console.print(stats_table)
    
    # 失败案例详情
    if failed_cases:
        console.print(f"\n[bold red]❌ 失败的测试用例 ({len(failed_cases)} 个):[/bold red]")
        
        fail_table = Table(show_header=True, header_style="bold red")
        fail_table.add_column("ID", style="dim", width=4)
        fail_table.add_column("类别", style="cyan", width=15)
        fail_table.add_column("问题", style="white", width=45)
        fail_table.add_column("错误信息", style="red", width=25)
        
        for case in failed_cases:
            fail_table.add_row(
                str(case["id"]),
                case["category"],
                case["question"][:42] + "..." if len(case["question"]) > 45 else case["question"],
                case["result"]
            )
        
        console.print(fail_table)

    # 性能评估
    console.print(f"\n[bold]🎯 系统评估:[/bold]")
    if success_rate >= 90:
        console.print("[bold green]⭐⭐⭐⭐⭐ 优秀 - 系统运行完美！[/bold green]")
    elif success_rate >= 80:
        console.print("[bold green]⭐⭐⭐⭐ 良好 - 系统表现优秀[/bold green]")
    elif success_rate >= 70:
        console.print("[bold yellow]⭐⭐⭐ 可用 - 系统基本可用[/bold yellow]")
    elif success_rate >= 60:
        console.print("[bold yellow]⭐⭐ 一般 - 系统需要改进[/bold yellow]")
    else:
        console.print("[bold red]⭐ 待改进 - 系统需要重大优化[/bold red]")

    return success_rate >= 70  # 70%通过率算成功

def main():
    """主函数"""
    console.print("[bold cyan]🤖 AI问答系统完整测试工具[/bold cyan]")
    console.print("[dim]包含基础功能测试和高级业务场景测试[/dim]")
    console.print()
    
    # 获取脚本目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_path = os.path.join(script_dir, "all_queries.yaml")
    
    success = run_all_tests(yaml_path)
    
    if success:
        console.print("\n[bold green]✅ 测试整体通过，系统运行良好！[/bold green]")
        sys.exit(0)
    else:
        console.print("\n[bold yellow]⚠️ 部分功能需要改进[/bold yellow]")
        sys.exit(1)

if __name__ == "__main__":
    main() 