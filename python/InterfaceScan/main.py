import os
from datetime import datetime,timedelta
from fetcher import fetch_api_data,read_api_data
from reporter import generate_report
import yaml

# 获取当前时间和上个月时间
today = datetime.today().strftime("%Y-%m")
last_month = (datetime.today().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")

# 获取项目列表
with open('config.yaml', 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

projects = config['projects']

# 遍历每个项目
for project_name, config in projects.items():
    url = config['url']
    print(f"[✓] 正在抓取 {project_name} 接口数据...")
    
    # 抓取最新的接口数据
    new_data = fetch_api_data(project_name, url,today)
    if not new_data:
        continue
    print(f"[✓] {project_name} 接口数据抓取完成。")

    # 获取上月的接口数据
    old_data = read_api_data(project_name, last_month)
    
    if old_data:
        # 对比新增接口
        generate_report(project_name, new_data, old_data, today)
    else:
        print(f"[✗] 无法找到上月的接口数据: {project_name}，跳过对比和保存步骤。")
