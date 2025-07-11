#!/usr/bin/env python3
"""
AI问答系统快速测试脚本
测试核心功能是否正常工作
"""

import requests
import time
from rich import print
from rich.console import Console

console = Console()

API_URL = "http://localhost:8000/api/chat"

def test_api_health():
    """测试API健康状态"""
    try:
        resp = requests.get("http://localhost:8000/api/chat/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            console.print(f"[green]✅ API健康状态: {data.get('status')}[/green]")
            return True
        else:
            console.print(f"[red]❌ API健康检查失败: {resp.status_code}[/red]")
            return False
    except Exception as e:
        console.print(f"[red]❌ API连接失败: {e}[/red]")
        return False

def test_basic_queries():
    """测试基础查询功能"""
    test_cases = [
        {
            "q": "海曙区总共有多少条事件记录？",
            "expect": ["5810"],
            "name": "基础统计"
        },
        {
            "q": "镇街事件数量前5名",
            "expect": ["镇街", "集士港镇"],
            "name": "排名查询"
        },
        {
            "q": "三级事件有多少条？",
            "expect": ["三级"],
            "name": "级别统计"
        },
        {
            "q": "包含退款的事件案例",
            "expect": ["退款"],
            "name": "文本搜索"
        },
        {
            "q": "6月5日月湖街道的三级事件数量",
            "expect": ["月湖街道"],
            "name": "复合查询"
        }
    ]
    
    passed = 0
    total = len(test_cases)
    
    console.print(f"\n[bold cyan]🧪 开始基础功能测试 ({total} 个用例)[/bold cyan]\n")
    
    for i, case in enumerate(test_cases, 1):
        console.print(f"[blue]#{i}[/blue] [bold]{case['name']}[/bold]: {case['q']}")
        
        try:
            resp = requests.post(API_URL, json={"message": case['q']}, timeout=30)
            
            if resp.status_code == 200:
                data = resp.json()
                answer = data.get("message", "")
                
                if data.get("success", False) and answer:
                    # 检查关键词
                    missing = [kw for kw in case['expect'] if kw not in answer]
                    
                    if not missing:
                        console.print(f"     [green]✅ 通过[/green]")
                        console.print(f"     [dim]回答: {answer[:100]}...[/dim]")
                        passed += 1
                    else:
                        console.print(f"     [yellow]⚠️ 部分通过 (缺失: {missing})[/yellow]")
                        console.print(f"     [dim]回答: {answer[:100]}...[/dim]")
                        passed += 0.5
                else:
                    console.print(f"     [red]❌ API返回错误[/red]")
                    console.print(f"     [dim]错误: {answer}[/dim]")
            else:
                console.print(f"     [red]❌ HTTP错误: {resp.status_code}[/red]")
                
        except Exception as e:
            console.print(f"     [red]❌ 请求异常: {e}[/red]")
        
        console.print()
        time.sleep(2)
    
    # 显示结果
    success_rate = passed / total * 100
    console.print("=" * 60)
    console.print(f"[bold cyan]📊 测试结果: {passed} / {total} 通过 ({success_rate:.1f}%)[/bold cyan]")
    
    if success_rate >= 80:
        console.print("[bold green]🎉 系统运行良好！[/bold green]")
        return True
    elif success_rate >= 60:
        console.print("[bold yellow]⚠️ 系统基本可用，需要改进[/bold yellow]")
        return True
    else:
        console.print("[bold red]❌ 系统需要修复[/bold red]")
        return False

def main():
    """主函数"""
    console.print("[bold cyan]🚀 AI问答系统快速测试[/bold cyan]")
    console.print()
    
    # 检查API健康状态
    if not test_api_health():
        console.print("\n[red]❌ API服务不可用，请检查后端服务[/red]")
        return False
    
    # 运行基础测试
    success = test_basic_queries()
    
    if success:
        console.print("\n[bold green]✅ 快速测试通过，可以运行完整测试[/bold green]")
        console.print("[dim]运行完整测试: python test_all_queries.py[/dim]")
    else:
        console.print("\n[bold red]❌ 快速测试失败，请检查系统配置[/bold red]")
    
    return success

if __name__ == "__main__":
    main() 