const fileList = document.getElementById("file-list");
const searchBox = document.getElementById("searchBox");

let files = []; // 从接口获得，树形结构
let filteredFiles = []; // 搜索过滤后结果

// 递归渲染树形文件夹
function renderTree(nodes, container) {
  container.innerHTML = '';
  const ul = document.createElement('ul');

  nodes.forEach(node => {
    const li = document.createElement('li');

    if (node.type === 'dir') {
      li.textContent = '📁 ' + node.name;
      li.style.cursor = 'pointer';

      const childrenContainer = document.createElement('div');
      childrenContainer.style.display = 'none';

      li.onclick = (e) => {
        e.stopPropagation();
        childrenContainer.style.display = childrenContainer.style.display === 'none' ? 'block' : 'none';
      };

      li.appendChild(childrenContainer);
      ul.appendChild(li);

      renderTree(node.children || [], childrenContainer);
    } else {
      // 文件节点
      const a = document.createElement('a');
      a.href = node.url;
      a.textContent = '📄 ' + node.name;
      a.download = node.name;
      a.target = '_blank';

      li.appendChild(a);
      ul.appendChild(li);
    }
  });

  container.appendChild(ul);
}

// 递归搜索过滤，保留匹配文件和其父目录
function filterTree(nodes, keyword) {
  const lowerKey = keyword.toLowerCase();
  const res = [];

  for (const node of nodes) {
    if (node.type === 'dir') {
      const filteredChildren = filterTree(node.children || [], keyword);
      if (filteredChildren.length > 0) {
        res.push({ ...node, children: filteredChildren });
      }
    } else if (node.name.toLowerCase().includes(lowerKey)) {
      res.push(node);
    }
  }
  return res;
}

// 搜索事件
searchBox.addEventListener('input', (e) => {
  const keyword = e.target.value.trim();
  if (!keyword) {
    filteredFiles = files;
  } else {
    filteredFiles = filterTree(files, keyword);
  }
  renderTree(filteredFiles, fileList);
});

// 初始化函数，加载数据并渲染
async function init() {
  try {
    fileList.innerHTML = '加载中...';
    const res = await fetch('https://openst.weizhihan3.workers.dev/contents/contents/schematic');
    files = await res.json();
    filteredFiles = files;
    renderTree(files, fileList);
  } catch (e) {
    fileList.innerHTML = '加载失败，请刷新重试';
    console.error(e);
  }
}

init();