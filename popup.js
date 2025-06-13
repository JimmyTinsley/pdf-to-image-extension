document.getElementById('convertBtn').addEventListener('click', async () => {
  const convertBtn = document.getElementById('convertBtn');
  const statusDiv = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.toLowerCase().endsWith('.pdf')) {
      statusDiv.textContent = '错误：当前页面不是 PDF。';
      statusDiv.style.display = 'block';
      setTimeout(() => window.close(), 2000);
      return;
    }

    chrome.runtime.sendMessage({ action: 'startConversion', url: tab.url, tabId: tab.id });

    statusDiv.textContent = '正在准备转换...';
    statusDiv.style.display = 'block';
    progressContainer.style.display = 'block';
    convertBtn.disabled = true;

  } catch (error) {
    console.error(error);
    statusDiv.textContent = '发生未知错误。';
    statusDiv.style.display = 'block';
    setTimeout(() => window.close(), 2000);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const statusDiv = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');

  if (message.action === 'conversionProgress') {
    if (message.status === 'start') {
      statusDiv.textContent = `准备转换 ${message.total} 页...`;
      progressBar.textContent = '0%';
      progressBar.style.width = '0%';
    } else if (message.status === 'progress') {
      const percentage = Math.round((message.current / message.total) * 100);
      progressBar.style.width = percentage + '%';
      progressBar.textContent = percentage + '%';
      statusDiv.textContent = `正在转换：第 ${message.current} 页 / 共 ${message.total} 页`;
    }
  } else if (message.action === 'conversionComplete') {
    statusDiv.textContent = '转换完成！';
    progressBar.style.width = '100%';
    progressBar.textContent = '100%';
    setTimeout(() => window.close(), 1000);
  }
});