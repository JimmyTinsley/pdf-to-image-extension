document.getElementById('convertBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查当前页面是否是 PDF
    if (!tab.url.toLowerCase().endsWith('.pdf')) {
      throw new Error('当前页面不是 PDF 文件');
    }

    // 发送消息给 content script 开始转换
    chrome.runtime.sendMessage({ action: 'startConversion', url: tab.url, tabId: tab.id });
    
    statusDiv.textContent = '正在转换中...';
    statusDiv.className = 'status success';
    statusDiv.style.display = 'block';
  } catch (error) {
    statusDiv.textContent = error.message;
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  }
}); 