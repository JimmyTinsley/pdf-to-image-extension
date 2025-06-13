// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('PDF to Image Converter 已安装');
});

// 新的消息监听器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startConversion') {
    const { url, tabId } = message;
    if (!url || !tabId) {
      console.error('缺少必要的参数');
      return;
    }

    // 下载 PDF 数据
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('网络响应错误');
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        // 将 ArrayBuffer 转换为 Base64 字符串
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        // 按顺序注入脚本
        const scripts = ['pdf.js', 'jszip.min.js', 'content.js'];
        
        function injectNextScript(index) {
          if (index >= scripts.length) {
            // 所有脚本注入完成，发送数据
            const filename = decodeURIComponent(url.split('/').pop());
            const baseName = filename.substring(0, filename.lastIndexOf('.'));
            chrome.tabs.sendMessage(tabId, {
              action: 'convertPdfData',
              data: base64,
              baseName: baseName
            });
            return;
          }
          
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scripts[index]]
          }).then(() => {
            injectNextScript(index + 1);  // 注入下一个脚本
          }).catch(error => {
            console.error('注入脚本错误:', error);
          });
        }
        
        injectNextScript(0);  // 开始注入
      })
      .catch(error => {
        console.error('获取 PDF 数据错误:', error);
        // 可以选择发送错误消息给 popup 或 content
      });
  } else if (message.action === 'conversionProgress') {
    // 将进度消息直接转发给 popup
    chrome.runtime.sendMessage(message);
  } else if (message.action === 'conversionComplete') {
    // 触发“另存为”下载
    chrome.downloads.download({
      url: message.dataUrl,
      filename: message.filename,
      saveAs: true
    });
    // 转发一个纯净的完成消息给 popup，让它关闭
    chrome.runtime.sendMessage({ action: 'conversionComplete' });
  }
});