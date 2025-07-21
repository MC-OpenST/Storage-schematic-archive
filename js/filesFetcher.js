const API_URL = "https://openst.weizhihan3.workers.dev/contents/contents/schematic";

async function fetchFiles(url = API_URL, prefix = "") {
    const res = await fetch(url);
    if (!res.ok) throw new Error("网络错误，无法获取文件列表");
    const data = await res.json();

    let files = [];

    for (const item of data) {
        if (item.type === "dir") {
            // 递归获取子目录文件，prefix加上当前目录名和斜杠
            const subFiles = await fetchFiles(item.url, prefix + item.name + "/");
            files = files.concat(subFiles);
        } else if (item.name.endsWith(".litematic") || item.name.endsWith(".zip")) {
            const fullPath = prefix + item.name;
            files.push({
                name: item.name,
                path: fullPath,
                url: `https://openst.weizhihan3.workers.dev/raw/${encodeURIComponent(fullPath)}`,
            });
        }
    }

    return files;
}
