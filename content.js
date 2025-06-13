// 监听来自 popup 的消息
// 使用一个标志来确保监听器只被添加一次
if (typeof window.pdfToImageConverterListenerAttached === 'undefined') {
  window.pdfToImageConverterListenerAttached = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'convertPdfData') {
      // 将 Base64 字符串解码为 Uint8Array
      const byteCharacters = atob(request.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const uint8Array = new Uint8Array(byteNumbers);
      
      convertPDFToImages(uint8Array, request.baseName);
    }
  });
}

async function convertPDFToImages(uint8Array, baseName) {
  try {
    // 设置 PDF.js worker 的路径
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');
    
    // 获取 PDF 文档
    const pdfDoc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const numPages = pdfDoc.numPages;
    // 发送开始转换的消息
    chrome.runtime.sendMessage({ action: 'conversionProgress', status: 'start', total: numPages });
    const images = [];

    // 遍历每一页
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2倍缩放以获得更好的质量

      // 创建 canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染 PDF 页面到 canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // 发送进度消息
      chrome.runtime.sendMessage({ action: 'conversionProgress', status: 'progress', current: i, total: numPages });

      // 将 canvas 转换为图片
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      images.push(imageData);
    }

    // 如果只有一页，直接下载图片
    if (images.length === 1) {
      downloadImage(images[0], `${baseName}_to_image.jpg`);
    } else {
      // 多页则打包下载
      await downloadAsZip(images, baseName);
    }

  } catch (error) {
    console.error('转换过程中出错:', error);
    // （可选）向用户显示错误通知
  }
}

function downloadImage(dataUrl, filename) {
  chrome.runtime.sendMessage({ action: 'conversionComplete', dataUrl: dataUrl, filename: filename });
}

async function downloadAsZip(images, baseName) {
  const zip = new JSZip();
  
  // 将每张图片添加到 zip
  images.forEach((imageData, index) => {
    const base64Data = imageData.split(',')[1];
    zip.file(`${baseName}_to_image_${index + 1}.jpg`, base64Data, { base64: true });
  });

  // 生成 zip 文件
  const content = await zip.generateAsync({ type: 'blob' });
  
  const reader = new FileReader();
  reader.onload = function(event) {
    chrome.runtime.sendMessage({
      action: 'conversionComplete',
      dataUrl: event.target.result,
      filename: `${baseName}_to_image.zip`
    });
  };
  reader.readAsDataURL(content);
}