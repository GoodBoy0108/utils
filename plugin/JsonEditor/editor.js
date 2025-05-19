document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const jsonInput = document.getElementById('json-input');
  const visualEditor = document.getElementById('visual-editor');
  const validateBtn = document.getElementById('validate-btn');
  const formatBtn = document.getElementById('format-btn');
  const minifyBtn = document.getElementById('minify-btn');
  const saveBtn = document.getElementById('save-btn');
  const copyBtn = document.getElementById('copy-btn');
  const validationMsg = document.getElementById('validation-message');
  const statusBar = document.getElementById('status-bar');
  const charCount = document.getElementById('char-count');
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  
  // 从URL获取原始标签ID
  const urlParams = new URLSearchParams(window.location.search);
  const originalTabId = parseInt(urlParams.get('tabId'));
  
  // 数据模型
  let jsonData = {};
  let isVisualEditorUpdating = false;
  let isTextEditorUpdating = false;
  
  // 检查chrome.storage是否可用
  if (typeof chrome !== 'undefined' && chrome.storage) {
    // 加载JSON数据
    chrome.storage.local.get('editorJSON', function(result) {
      if (result.editorJSON) {
        try {
          jsonData = JSON.parse(result.editorJSON);
          jsonInput.value = result.editorJSON;
          renderVisualEditor(jsonData);
        } catch (e) {
          showStatus('Invalid JSON format: ' + e.message, 'error');
          jsonData = {};
          jsonInput.value = JSON.stringify(jsonData, null, 2);
          renderVisualEditor(jsonData);
        }
      } else {
        jsonData = {};
        jsonInput.value = JSON.stringify(jsonData, null, 2);
        renderVisualEditor(jsonData);
      }
      updateCharCount();
    });
  } else {
    console.error('Chrome storage API not available');
    jsonData = {};
    jsonInput.value = JSON.stringify(jsonData, null, 2);
    renderVisualEditor(jsonData);
    updateCharCount();
    showStatus('无法访问Chrome存储API，请确保以扩展方式运行', 'error');
  }
  
  // 验证按钮点击事件
  validateBtn.addEventListener('click', function() {
    const result = validateJSON();
    if (result) {
      showStatus('校验成功', 'success');
    } else {
      showStatus('校验失败，请检查JSON格式', 'error');
    }
  });
  
  // 格式化按钮点击事件
  formatBtn.addEventListener('click', function() {
    try {
      jsonData = JSON.parse(jsonInput.value);
      jsonInput.value = JSON.stringify(jsonData, null, 2);
      renderVisualEditor(jsonData);
      showStatus('格式化成功', 'success');
      updateCharCount();
    } catch (e) {
      showStatus('格式化失败：' + e.message, 'error');
    }
  });
  
  // 压缩按钮点击事件
  minifyBtn.addEventListener('click', function() {
    try {
      jsonData = JSON.parse(jsonInput.value);
      jsonInput.value = JSON.stringify(jsonData);
      renderVisualEditor(jsonData);
      showStatus('压缩成功', 'success');
      updateCharCount();
    } catch (e) {
      showStatus('压缩失败：' + e.message, 'error');
    }
  });
  
  // 复制按钮点击事件
  copyBtn.addEventListener('click', function() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonInput.value)
        .then(() => showStatus('已复制到剪贴板', 'success'))
        .catch(err => showStatus('复制失败：' + err.message, 'error'));
    } else {
      // 回退到旧方法
      jsonInput.select();
      document.execCommand('copy');
      showStatus('已复制到剪贴板', 'success');
    }
  });
  
  // 展开/折叠全部按钮功能
  expandAllBtn.addEventListener('click', function() {
    document.querySelectorAll('.json-node').forEach(node => {
      node.classList.remove('collapsed');
      node.classList.add('expanded');
    });
  });
  
  collapseAllBtn.addEventListener('click', function() {
    document.querySelectorAll('.json-node').forEach(node => {
      node.classList.remove('expanded');
      node.classList.add('collapsed');
    });
  });
  
  // JSON输入变化时更新可视化编辑器
  jsonInput.addEventListener('input', function() {
    if (isVisualEditorUpdating) return;
    
    isTextEditorUpdating = true;
    try {
      jsonData = JSON.parse(jsonInput.value);
      renderVisualEditor(jsonData);
      validationMsg.textContent = 'Valid JSON';
      validationMsg.className = 'mt-2 text-sm text-green-600';
    } catch (e) {
      validationMsg.textContent = 'Invalid JSON: ' + e.message;
      validationMsg.className = 'mt-2 text-sm text-red-600';
    }
    updateCharCount();
    isTextEditorUpdating = false;
  });
  
  // 验证JSON
  function validateJSON() {
    try {
      jsonData = JSON.parse(jsonInput.value);
      validationMsg.textContent = 'Valid JSON';
      validationMsg.className = 'mt-2 text-sm text-green-600';
      showStatus('JSON is valid', 'success');
      return true;
    } catch (e) {
      validationMsg.textContent = 'Invalid JSON: ' + e.message;
      validationMsg.className = 'mt-2 text-sm text-red-600';
      showStatus('Invalid JSON: ' + e.message, 'error');
      return false;
    }
  }
  
  // 渲染可视化编辑器（支持编辑）
  function renderVisualEditor(data, path = []) {
    isVisualEditorUpdating = true;
    visualEditor.innerHTML = '';
    
    if (typeof data === 'object' && data !== null) {
      const ul = document.createElement('ul');
      ul.className = 'list-none p-0 m-0';
      
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          const li = createEditableNode(`[${index}]`, item, [...path, index]);
          ul.appendChild(li);
        });
      } else {
        Object.keys(data).forEach(key => {
          const li = createEditableNode(key, data[key], [...path, key]);
          ul.appendChild(li);
        });
      }
      
      visualEditor.appendChild(ul);
    } else {
      visualEditor.textContent = typeof data === 'string' ? `"${data}"` : data;
    }
    
    // 重新绑定折叠/展开事件
    document.querySelectorAll('.json-toggle').forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        const node = this.closest('.json-node');
        if (node.classList.contains('collapsed')) {
          node.classList.remove('collapsed');
          node.classList.add('expanded');
        } else {
          node.classList.remove('expanded');
          node.classList.add('collapsed');
        }
        e.stopPropagation();
      });
    });
    
    isVisualEditorUpdating = false;
  }
  
  // 创建可编辑的节点元素
  function createEditableNode(key, value, path) {
    const li = document.createElement('li');
    li.className = 'json-node mb-1 fade-in expanded';
    
    // 创建键名显示
    const keyContainer = document.createElement('div');
    keyContainer.className = 'flex items-start';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'json-key';
    keySpan.textContent = key + ': ';
    
    keyContainer.appendChild(keySpan);
    
    // 对象/数组节点
    if (typeof value === 'object' && value !== null) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'json-toggle text-gray-500 hover:text-gray-700 focus:outline-none mr-1';
      toggleBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
      
      const container = document.createElement('div');
      container.className = 'json-node-content pl-4 mt-1';
      
      const ul = document.createElement('ul');
      ul.className = 'list-none p-0 m-0';
      
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const itemLi = createEditableNode(`[${index}]`, item, [...path, index]);
          ul.appendChild(itemLi);
        });
        
        // 添加新元素按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'text-xs text-blue-600 hover:text-blue-800 mt-1';
        addBtn.innerHTML = '<i class="fa fa-plus-circle mr-1"></i> Add Item';
        addBtn.addEventListener('click', () => addNewArrayElement(path));
        
        ul.appendChild(createControlItem(addBtn));
      } else {
        Object.keys(value).forEach(childKey => {
          const childLi = createEditableNode(childKey, value[childKey], [...path, childKey]);
          ul.appendChild(childLi);
        });
        
        // 添加新属性按钮
        const addBtn = document.createElement('button');
        addBtn.className = 'text-xs text-blue-600 hover:text-blue-800 mt-1';
        addBtn.innerHTML = '<i class="fa fa-plus-circle mr-1"></i> Add Property';
        addBtn.addEventListener('click', () => addNewObjectProperty(path));
        
        ul.appendChild(createControlItem(addBtn));
      }
      
      container.appendChild(ul);
      keyContainer.appendChild(toggleBtn);
      li.appendChild(keyContainer);
      li.appendChild(container);
    } 
    // 基本值节点（可编辑）
    else {
      const valueContainer = document.createElement('div');
      valueContainer.className = 'flex items-center';
      
      const valueSpan = document.createElement('span');
      
      if (typeof value === 'string') {
        valueSpan.className = 'json-string';
        valueSpan.textContent = `"${value}"`;
      } else if (typeof value === 'number') {
        valueSpan.className = 'json-number';
        valueSpan.textContent = value;
      } else if (typeof value === 'boolean') {
        valueSpan.className = 'json-boolean';
        valueSpan.textContent = value;
      } else if (value === null) {
        valueSpan.className = 'json-null';
        valueSpan.textContent = 'null';
      }
      
      const editBtn = document.createElement('button');
      editBtn.className = 'ml-2 text-gray-500 hover:text-gray-700 focus:outline-none text-xs';
      editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
      editBtn.addEventListener('click', () => startEditing(path, value, valueSpan));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'ml-1 text-gray-500 hover:text-red-500 focus:outline-none text-xs';
      deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
      deleteBtn.addEventListener('click', () => deleteNode(path));
      
      valueContainer.appendChild(valueSpan);
      valueContainer.appendChild(editBtn);
      
      if (path.length > 0) { // 根节点不能删除
        valueContainer.appendChild(deleteBtn);
      }
      
      keyContainer.appendChild(valueContainer);
      li.appendChild(keyContainer);
    }
    
    return li;
  }
  
  // 创建控制项（如添加按钮）
  function createControlItem(element) {
    const li = document.createElement('li');
    li.className = 'mt-1';
    li.appendChild(element);
    return li;
  }
  
  // 开始编辑节点值
  function startEditing(path, currentValue, displayElement) {
    const parentElement = displayElement.parentElement;
    parentElement.innerHTML = '';
    
    let inputElement;
    let typeSelect;
    
    if (typeof currentValue === 'object' && currentValue !== null) {
      // 对象/数组不能直接编辑整个值
      displayElement.textContent = typeof currentValue === 'array' ? '[...]' : '{...}';
      parentElement.appendChild(displayElement);
      return;
    }
    
    // 根据值类型创建相应的输入控件
    if (typeof currentValue === 'string') {
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.value = currentValue;
      inputElement.className = 'json-edit-input border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs';
    } else if (typeof currentValue === 'number') {
      inputElement = document.createElement('input');
      inputElement.type = 'number';
      inputElement.value = currentValue;
      inputElement.className = 'json-edit-input border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs';
    } else if (typeof currentValue === 'boolean') {
      typeSelect = document.createElement('select');
      typeSelect.className = 'json-edit-select border border-gray-300 rounded px-2 py-1 text-sm mr-2';
      
      const trueOption = document.createElement('option');
      trueOption.value = 'true';
      trueOption.textContent = 'true';
      trueOption.selected = currentValue === true;
      
      const falseOption = document.createElement('option');
      falseOption.value = 'false';
      falseOption.textContent = 'false';
      falseOption.selected = currentValue === false;
      
      typeSelect.appendChild(trueOption);
      typeSelect.appendChild(falseOption);
    } else if (currentValue === null) {
      typeSelect = document.createElement('select');
      typeSelect.className = 'json-edit-select border border-gray-300 rounded px-2 py-1 text-sm mr-2';
      
      const nullOption = document.createElement('option');
      nullOption.value = 'null';
      nullOption.textContent = 'null';
      nullOption.selected = true;
      
      const stringOption = document.createElement('option');
      stringOption.value = 'string';
      stringOption.textContent = 'string';
      
      const numberOption = document.createElement('option');
      numberOption.value = 'number';
      numberOption.textContent = 'number';
      
      const booleanOption = document.createElement('option');
      booleanOption.value = 'boolean';
      booleanOption.textContent = 'boolean';
      
      typeSelect.appendChild(nullOption);
      typeSelect.appendChild(stringOption);
      typeSelect.appendChild(numberOption);
      typeSelect.appendChild(booleanOption);
      
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.disabled = true;
      inputElement.className = 'json-edit-input border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs';
      
      typeSelect.addEventListener('change', function() {
        inputElement.disabled = this.value === 'null';
      });
    }
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'json-edit-action save ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700';
    saveBtn.textContent = 'Save';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'json-edit-action cancel ml-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700';
    cancelBtn.textContent = 'Cancel';
    
    if (typeSelect) {
      parentElement.appendChild(typeSelect);
    }
    
    if (inputElement) {
      parentElement.appendChild(inputElement);
    }
    
    parentElement.appendChild(saveBtn);
    parentElement.appendChild(cancelBtn);
    
    // 保存修改
    saveBtn.addEventListener('click', function() {
      let newValue;
      
      if (typeSelect) {
        const selectedType = typeSelect.value;
        
        if (selectedType === 'null') {
          newValue = null;
        } else if (selectedType === 'boolean') {
          newValue = inputElement ? inputElement.value === 'true' : typeSelect.value === 'true';
        } else if (selectedType === 'number') {
          newValue = parseFloat(inputElement.value);
        } else {
          newValue = inputElement.value;
        }
      } else {
        if (inputElement.type === 'number') {
          newValue = parseFloat(inputElement.value);
        } else {
          newValue = inputElement.value;
        }
      }
      
      updateNodeValue(path, newValue);
    });
    
    // 取消修改
    cancelBtn.addEventListener('click', function() {
      renderVisualEditor(jsonData);
    });
    
    // 按Enter保存
    if (inputElement) {
      inputElement.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          saveBtn.click();
        }
      });
    }
    
    // 聚焦输入框
    if (inputElement) {
      inputElement.focus();
    }
  }
  
  // 更新节点值
  function updateNodeValue(path, newValue) {
    let target = jsonData;
    
    // 遍历到目标节点
    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
    }
    
    // 更新值
    const lastKey = path[path.length - 1];
    target[lastKey] = newValue;
    
    // 更新UI
    updateEditors();
    showStatus('Value updated', 'success');
  }
  
  // 删除节点
  function deleteNode(path) {
    if (confirm('确定要删除这个节点吗？')) {
      let target = jsonData;
      
      // 遍历到目标节点的父节点
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      
      // 删除值
      const lastKey = path[path.length - 1];
      
      if (Array.isArray(target)) {
        target.splice(lastKey, 1);
      } else {
        delete target[lastKey];
      }
      
      // 更新UI
      updateEditors();
      showStatus('Node deleted', 'success');
    }
  }
  
  // 添加新数组元素
  function addNewArrayElement(path) {
    let target = jsonData;
    
    // 遍历到目标数组
    for (let i = 0; i < path.length; i++) {
      target = target[path[i]];
    }
    
    // 添加新元素
    target.push(null);
    
    // 更新UI
    updateEditors();
    showStatus('New array element added', 'success');
  }
  
  // 添加新对象属性
  function addNewObjectProperty(path) {
    let target = jsonData;
    
    // 遍历到目标对象
    for (let i = 0; i < path.length; i++) {
      target = target[path[i]];
    }
    
    // 提示输入新属性名
    const newKey = prompt('输入新属性名:');
    if (newKey && newKey.trim()) {
      target[newKey.trim()] = null;
      
      // 更新UI
      updateEditors();
      showStatus('New property added', 'success');
    }
  }
  
  // 更新两个编辑器
  function updateEditors() {
    // 更新文本编辑器
    isTextEditorUpdating = true;
    jsonInput.value = JSON.stringify(jsonData, null, 2);
    isTextEditorUpdating = false;
    
    // 更新可视化编辑器
    renderVisualEditor(jsonData);
    
    // 更新字符计数
    updateCharCount();
  }
  
  // 显示状态消息
  function showStatus(message, type) {
    // console.log('showStatus:', message, type); // 调试用
    statusBar.textContent = message;
    statusBar.className = `status-bar ${type === 'success' ? 'success' : 'error'} fade-in`;
    statusBar.style.display = 'block';
    statusBar.style.visibility = 'visible';
    statusBar.style.opacity = '1';
    setTimeout(() => {
      statusBar.style.display = 'none';
    }, 5000); // 显示5秒
  }
  
  // 更新字符计数
  function updateCharCount() {
    charCount.textContent = `${jsonInput.value.length} characters`;
  }

  // 初始化行号显示
  function initLineNumbers() {
    const textarea = document.getElementById('json-input');
    const lineNumbers = document.getElementById('line-numbers');
    
    function updateLineNumbers() {
      const lines = textarea.value.split('\n');
      lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
    }
    
    // 监听输入事件
    textarea.addEventListener('input', updateLineNumbers);
    
    // 同步滚动
    textarea.addEventListener('scroll', () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    });
    
    // 初始化行号
    updateLineNumbers();
  }

  // 在文档加载完成后初始化
  initLineNumbers();
});  