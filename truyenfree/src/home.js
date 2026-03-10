function execute() {
    return Response.success([
        { title: "Mới Cập Nhật", input: "https://truyenfree.org/danh-sach/truyen-moi", script: "gen.js" },
        { title: "Đọc Nhiều", input: "https://truyenfree.org/xep-hang/luot-doc", script: "gen.js" },
        { title: "Tiên Hiệp", input: "https://truyenfree.org/danh-sach/tien-hiep", script: "gen.js" },
        { title: "Huyền Huyễn", input: "https://truyenfree.org/danh-sach/huyen-huyen", script: "gen.js" },
        { title: "Đô Thị", input: "https://truyenfree.org/danh-sach/do-thi", script: "gen.js" }
    ]);
}
