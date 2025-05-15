document.addEventListener('DOMContentLoaded', function() {
  const openBtn = document.getElementById('openEditor');
  const statusMsg = document.getElementById('status-message');

  openBtn.addEventListener('click', openEditor);

  function openEditor() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      
      // 向内容脚本发送消息获取JSON
      chrome.tabs.sendMessage(currentTab.id, {action: "getJSON"}, function(response) {
        if (response && response.json) {
          try {
            // 存储JSON到本地存储
            chrome.storage.local.set({ 'editorJSON': response.json }, function() {
              // 创建新标签打开编辑器
              const editorUrl = chrome.runtime.getURL('editor.html') + `?tabId=${currentTab.id}`;
              chrome.tabs.create({ url: editorUrl }, function(editorTab) {
                statusMsg.className = 'status success';
                statusMsg.textContent = 'Editor opened in new tab';
              });
            });
          } catch (e) {
            statusMsg.className = 'status error';
            statusMsg.textContent = 'Invalid JSON: ' + e.message;
          }
        } else {
          statusMsg.className = 'status error';
          statusMsg.textContent = 'No JSON found on this page';
          
          // 打开空编辑器
          const editorUrl = chrome.runtime.getURL('editor.html') + `?tabId=${currentTab.id}`;
          chrome.tabs.create({ url: editorUrl });
        }
      });
    });
  }
});
  