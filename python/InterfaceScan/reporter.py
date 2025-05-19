import json
import os

def generate_report(project_name, new_data, old_data, report_date):
    newly_added = [path for path in new_data['paths'] if path not in old_data['paths']]
    report_dir = f"reports/{report_date}"
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, f"{project_name}_{report_date}_新增接口.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# {project_name} 新增接口报告（{report_date}）\n\n")
        if newly_added:
            for path in newly_added:
                f.write(f"- `{path}`\n")
        else:
            f.write("本月无新增接口。\n")
    print(f"[✓] 报告已生成: {report_path}")
