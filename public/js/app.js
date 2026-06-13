document.addEventListener('DOMContentLoaded', () => {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const fileList = document.getElementById('fileList');
  const controls = document.getElementById('controls');
  const actionSelect = document.getElementById('actionSelect');
  const valueGroup = document.getElementById('valueGroup');
  const valueLabel = document.getElementById('valueLabel');
  const valueInput = document.getElementById('valueInput');
  const qualityGroup = document.getElementById('qualityGroup');
  const qualityInput = document.getElementById('qualityInput');
  const qualityDisplay = document.getElementById('qualityDisplay');
  const processBtn = document.getElementById('processBtn');
  const progress = document.getElementById('progress');
  const progressBar = document.querySelector('.progress-bar');
  const progressText = document.getElementById('progressText');
  const results = document.getElementById('results');
  const toast = document.getElementById('toast');

  let selectedFiles = [];

  function showToast(msg, isError = false) {
    toast.textContent = msg;
    toast.style.background = isError ? '#e74c3c' : '#333';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1048576).toFixed(1) + 'MB';
  }

  function updateFileList() {
    if (selectedFiles.length === 0) { fileList.innerHTML = ''; controls.style.display = 'none'; return; }
    controls.style.display = 'block';
    fileList.innerHTML = selectedFiles.map((f, i) =>
      `<div class="file-thumb"><img src="${URL.createObjectURL(f)}"><button class="remove" data-i="${i}">×</button></div>`
    ).join('');
    fileList.querySelectorAll('.remove').forEach(b => b.addEventListener('click', () => {
      selectedFiles.splice(parseInt(b.dataset.i), 1);
      updateFileList();
      if (selectedFiles.length === 0) showToast('已清空所有文件');
    }));
  }

  // Upload zone events
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length + selectedFiles.length > 50) return showToast('最多50张图片', true);
    selectedFiles = [...selectedFiles, ...files];
    updateFileList();
    showToast(`已添加 ${files.length} 张图片`);
  });
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files).filter(f => f.type.startsWith('image/'));
    if (files.length + selectedFiles.length > 50) return showToast('最多50张图片', true);
    selectedFiles = [...selectedFiles, ...files];
    updateFileList();
    showToast(`已添加 ${files.length} 张图片`);
    fileInput.value = '';
  });

  // Action change
  actionSelect.addEventListener('change', () => {
    const v = actionSelect.value;
    valueGroup.style.display = v === 'resize' ? 'block' : 'none';
    qualityGroup.style.display = v === 'compress' || v === 'format' ? 'block' : 'none';
    if (v === 'resize') { valueLabel.textContent = '缩放宽度 (像素)'; valueInput.placeholder = '1920'; }
  });
  qualityInput.addEventListener('input', () => { qualityDisplay.textContent = qualityInput.value; });

  // Process
  processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return showToast('请先选择图片', true);
    processBtn.disabled = true;
    processBtn.textContent = '⏳ 处理中...';
    progress.style.display = 'flex';
    results.innerHTML = '';

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('images', f));
    formData.append('action', actionSelect.value);
    formData.append('value', valueInput.value);
    formData.append('quality', qualityInput.value);

    try {
      const resp = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || '处理失败');

      progressBar.style.setProperty('--pct', '100%');
      progressBar.style.setProperty('width', '100%');

      results.innerHTML = '<h3 style="margin-bottom:12px;color:#333;">✅ 处理完成</h3>' +
        data.files.map(f => `
          <div class="result-item">
            <div class="info">
              <div class="name">${f.originalName} → ${f.name}</div>
              <div class="size">${formatSize(f.size)}</div>
            </div>
            <a href="${f.url}" class="dl-btn" download>下载</a>
          </div>
        `).join('');
      showToast(`成功处理 ${data.files.length} 张图片`);
      selectedFiles = [];
      updateFileList();
    } catch (err) {
      showToast('处理失败: ' + err.message, true);
    } finally {
      processBtn.disabled = false;
      processBtn.textContent = '🚀 开始处理';
      setTimeout(() => { progress.style.display = 'none'; progressBar.style.setProperty('width', '0%'); }, 2000);
    }
  });
});
