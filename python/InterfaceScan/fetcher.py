import requests
import json
import yaml
import os

# 读取配置
with open('config.yaml', 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

projects = config['projects']

# 抓取接口数据
def fetch_api_data(project_name, url,date_str):
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
         # ✅ 确保 data 目录存在
        os.makedirs("data", exist_ok=True)
        os.makedirs(f"data/{date_str}", exist_ok=True)
        with open(f"data/{date_str}/{project_name}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return data
    else:
        print(f"[✗] 项目 {project_name} 接口抓取失败, 状态码: {response.status_code}")
        return None

def read_api_data(project_name, date_str):
    """读取已保存的 API 数据"""
    file_path = f"data/{date_str}/{project_name}.json"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[✗] 文件不存在: {file_path}")
        return None
    except json.JSONDecodeError:
        print(f"[✗] 文件格式错误: {file_path}")
        return None