chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getJSON") {
    const preTags = document.getElementsByTagName('pre');
    for (let i = 0; i < preTags.length; i++) {
      try {
        JSON.parse(preTags[i].textContent);
        sendResponse({json: preTags[i].textContent});
        return true;
      } catch (e) {
        // Not valid JSON, continue checking
      }
    }
    sendResponse({json: null});
  } else if (request.action === "saveJSON") {
    const preTags = document.getElementsByTagName('pre');
    for (let i = 0; i < preTags.length; i++) {
      try {
        JSON.parse(preTags[i].textContent);
        preTags[i].textContent = request.json;
        sendResponse({success: true});
        return true;
      } catch (e) {
        // Not valid JSON, continue checking
      }
    }
    sendResponse({success: false});
  }
});
  