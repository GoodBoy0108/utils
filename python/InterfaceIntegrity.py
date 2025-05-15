import yaml
import re
import requests
from requests.exceptions import RequestException

# 检查foxapi 中接口注释是否完整
# 配置 Cookie
HEADERS = {
    "Cookie": ""
}
def check_param_comments(schema, param_type):
    """
    检查参数的注释完整性
    :param schema: 参数的schema定义
    :param param_type: 参数类型，如"入参"或"出参"
    :return: 缺失注释的参数列表
    """
    missing_comments = []
    for prop, prop_schema in schema.get('properties', {}).items():
        if 'description' not in prop_schema:
            missing_comments.append((prop, param_type))
    return missing_comments

def fetch_url_content(url, timeout=5):
    """获取链接内容"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=timeout)
        if response.status_code == 200:
            return response.text  # 或者 response.content 获取二进制内容
        else:
            print(f"请求失败，状态码：{response.status_code} - {url}")
            return None
    except RequestException as e:
        print(f"请求异常：{str(e)} - {url}")
        return None


def check_api_comments(api_doc):
    """
    检查接口的入参和出参注释完整性
    :param api_doc: OpenAPI 3.0 格式的接口文档
    :return: 缺失注释的参数列表
    """
    missing_comments = []

    # 检查请求体入参
    request_body = api_doc.get('paths', {}).get('/xintong/smarterOrder/list', {}).get('post', {}).get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema', {})
    missing_comments.extend(check_param_comments(request_body, "入参"))

    # 检查响应出参
    response_200 = api_doc.get('paths', {}).get('/xintong/smarterOrder/list', {}).get('post', {}).get('responses', {}).get('200', {}).get('content', {}).get('application/json', {}).get('schema', {})
    missing_comments.extend(check_param_comments(response_200, "出参"))

    return missing_comments

def extract_api_info(doc_content):
    api_list = []
    # 提取接口路径（假设是OpenAPI 3.0格式中paths下的路径）
    path_pattern = r'paths:\n\s*([^:\n]+):'
    paths = re.findall(path_pattern, doc_content)
    for path in paths:
        api_info = {'接口路径': path}
        # 提取接口的请求方法（假设在路径下的方法，如post、get等）
        method_pattern = fr'{path}:\n\s*([a-z]+):'
        methods = re.findall(method_pattern, doc_content)
        api_info['请求方法'] = methods
        api_list.append(api_info)

    # 提取链接（假设文档中的链接是http或https开头的字符串）
    link_pattern = r'https?://[^\s<>"]+|http?://[^\s<>"]+'
    links = re.findall(link_pattern, doc_content)

    return api_list, links


def validate_descriptions(data):
    """验证所有参数的 description 是否存在"""
    missing_descriptions = []

    # 遍历所有接口路径
    for path, path_item in data.get('paths', {}).items():
        for method, operation in path_item.items():
            if method not in ['get', 'post', 'put', 'delete']:
                continue

            # 检查参数注释
            for param in operation.get('parameters', []):
                if (param.get('in', 'unknown') == 'header'):
                    continue
                if 'description' not in param or not param['description'].strip():
                    missing_descriptions.append({
                        "type": "参数",
                        "位置": param.get('in', 'unknown'),
                        "名称": param.get('name', 'unknown'),
                        "路径": f"{path} -> {method.upper()} -> parameters"
                    })

            # 检查请求体 Schema 属性注释
            request_body = operation.get('requestBody', {})
            content = request_body.get('content', {})
            for media_type, media_content in content.items():
                schema = media_content.get('schema', {})
                if '$ref' in schema:
                    # 处理引用（需要解析 components/schemas）
                    ref_path = schema['$ref'].split('/')[2:]
                    ref_schema = data['components']['schemas'][ref_path[-1]]
                    _check_schema(ref_schema, missing_descriptions, 
                                f"{path} -> {method.upper()} -> requestBody/{media_type}/schema")
                else:
                    _check_schema(schema, missing_descriptions, 
                                f"{path} -> {method.upper()} -> requestBody/{media_type}/schema")

    return missing_descriptions

def _check_schema(schema, missing_list, context_path):
    """递归检查 Schema 属性"""
    if 'properties' in schema:
        for prop_name, prop_schema in schema['properties'].items():
            # 检查当前属性是否有描述
            if 'description' not in prop_schema or not prop_schema['description'].strip():
                missing_list.append({
                    "type": "属性",
                    "名称": prop_name,
                    "路径": f"{context_path}/properties/{prop_name}"
                })
            
            # 递归检查嵌套对象
            if 'properties' in prop_schema:
                _check_schema(prop_schema, missing_list, f"{context_path}/properties/{prop_name}")
            elif 'items' in prop_schema:  # 处理数组
                _check_schema(prop_schema['items'], missing_list, f"{context_path}/properties/{prop_name}/items")
def extract_yaml(content):
    match = re.search(r'^```yaml\n(.*?)\n```', content, re.DOTALL)
    return match.group(1) if match else content

def extract_yaml_from_markdown(md_content):
    """从 Markdown 中提取 YAML 代码块"""
    # 匹配 ```yaml 包裹的代码块（非贪婪模式）
    pattern = r'```yaml\n(.*?)```'
    matches = re.findall(pattern, md_content, re.DOTALL)
    return matches[0].strip() if matches else None


if __name__ == "__main__":
    url = "https://apifox.com/apidoc/shared/63fb8076-9724-467d-8f2f-1e2339497e54/llms.txt"
    doc_text = fetch_url_content(url)
    # print(content1)


    # 修改后的正则表达式（去除了名称和链接之间的空格）
    pattern = r"- (.*?)\((https?://[^\s<>]+)\):"
    matches = re.findall(pattern, doc_text)

    for name, url in matches:
        content = fetch_url_content(url)
        yaml_content = extract_yaml_from_markdown(content)
        # print(yaml_content)
        data = yaml.safe_load(yaml_content)
        missing = validate_descriptions(data)
        if missing:
            print(missing)
