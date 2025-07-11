#!/usr/bin/env python3
"""
向量数据库管理脚本
"""

import os
import shutil
import chromadb
import sys

def get_dir_size(path):
    """获取目录大小（MB）"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            if os.path.exists(filepath):
                total_size += os.path.getsize(filepath)
    return total_size / (1024 * 1024)  # 转换为MB

def show_status():
    """显示ChromaDB状态"""
    try:
        chroma_path = os.path.join(os.path.dirname(__file__), '../data/chroma_db')
        
        if not os.path.exists(chroma_path):
            print("ℹ️  ChromaDB目录不存在")
            return
            
        size = get_dir_size(chroma_path)
        print(f"📊 ChromaDB状态:")
        print(f"   路径: {chroma_path}")
        print(f"   大小: {size:.1f} MB")
        
        # 尝试连接并获取集合信息
        try:
            client = chromadb.PersistentClient(path=chroma_path)
            collections = client.list_collections()
            print(f"   集合数量: {len(collections)}")
            
            for collection in collections:
                count = collection.count()
                print(f"   - {collection.name}: {count} 条记录")
                
        except Exception as e:
            print(f"   无法读取集合信息: {e}")
            
    except Exception as e:
        print(f"❌ 状态检查失败: {e}")

def cleanup():
    """清理ChromaDB"""
    try:
        chroma_path = os.path.join(os.path.dirname(__file__), '../data/chroma_db')
        
        if os.path.exists(chroma_path):
            size_before = get_dir_size(chroma_path)
            print(f"清理前数据库大小: {size_before:.1f} MB")
            print("🔄 删除向量数据库...")
            shutil.rmtree(chroma_path)
            print("✅ 向量数据库清理完成")
            print("💡 下次启动时将重新创建向量数据库")
        else:
            print("ℹ️  ChromaDB目录不存在，无需清理")
            
    except Exception as e:
        print(f"❌ 清理失败: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--status":
            show_status()
        elif sys.argv[1] == "--clean":
            cleanup()
        else:
            print("未知参数")
            sys.exit(1)
    else:
        print("向量数据库管理脚本")
        print("用法:")
        print("  python manage_vector_db.py --status   # 显示状态")
        print("  python manage_vector_db.py --clean    # 清理数据库")
        print("")
        show_status() 