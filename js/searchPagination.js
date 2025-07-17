// 负责分页、搜索、渲染文件列表和分页按钮

const fileList = document.getElementById("file-list");
const pagination = document.getElementById("pagination");
const searchBox = document.getElementById("searchBox");

let currentFiles = [];
let currentPage = 1;
const filesPerPage = 10;

// 入口：更新当前展示列表
function updateList(list) {
    currentFiles = list;
    currentPage = 1;
    renderPage();
}

// 渲染当前页文件
function renderPage() {
    fileList.classList.remove("loading");
    fileList.innerHTML = "";

    if (currentFiles.length === 0) {
        fileList.innerHTML = "<li>没有找到图纸。</li>";
        pagination.innerHTML = "";
        return;
    }

    const start = (currentPage - 1) * filesPerPage;
    const end = start + filesPerPage;
    const pageFiles = currentFiles.slice(start, end);

    for (const file of pageFiles) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = file.url;         // ✅ 使用 CF Worker 提供的链接
        a.textContent = file.name;
        a.download = file.name;    // ✅ 下载触发
        li.appendChild(a);
        fileList.appendChild(li);
    }

    renderPaginationControls();
}

// 分页控制
function renderPaginationControls() {
    pagination.innerHTML = "";

    const totalPages = Math.ceil(currentFiles.length / filesPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "上一页";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderPage();
    };

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "下一页";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        currentPage++;
        renderPage();
    };

    const pageInfo = document.createElement("span");
    pageInfo.textContent = ` 第 ${currentPage} 页 / 共 ${totalPages} 页 `;

    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
}

// 搜索事件
searchBox.addEventListener("input", (e) => {
    const keyword = e.target.value.trim().toLowerCase();
    if (!keyword) {
        updateList(files);
    } else {
        const filtered = files.filter((f) => f.name.toLowerCase().includes(keyword));
        updateList(filtered);
    }
});

// ✅ 页面初始化
(async function init() {
    try {
        await fetchFiles();
        updateList(files);
    } catch (e) {
        fileList.classList.remove("loading");
        fileList.innerHTML = "<li>加载失败，请刷新页面重试。</li>";
        console.error(e);
    }
})();
