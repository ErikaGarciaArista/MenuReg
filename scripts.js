const toggle = document.querySelector(".menu-toggle");
const sidebar = document.querySelector(".sidebar");
const tabs = document.querySelectorAll(".tab-link");
const contents = document.querySelectorAll(".tab-content");
const pageTitle = document.querySelector(".page-title");

function updatePageTitle() {
    const activeTab = document.querySelector(".tab-link.active");
    if (activeTab && pageTitle) {
        const tabText = activeTab.textContent.trim();
        pageTitle.textContent = tabText;
    }
}

updatePageTitle();

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(c => c.classList.remove("active"));

        tab.classList.add("active");
        const contentId = tab.dataset.tab;
        document.getElementById(contentId).classList.add("active");

        updatePageTitle();

        if (window.innerWidth <= 768 && sidebar.classList.contains("show")) {
            sidebar.classList.remove("show");
        }
    });
});

if (toggle) {
    toggle.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle("show");
        } else {
            sidebar.classList.toggle("collapsed");
        }
    });
}

function handleResize() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove("collapsed");
        sidebar.classList.remove("show");
    } else if (window.innerWidth <= 1024) {
        sidebar.classList.add("collapsed");
        sidebar.classList.remove("show");
    } else {
        sidebar.classList.remove("collapsed");
        sidebar.classList.remove("show");
    }
}

window.addEventListener("resize", handleResize);
window.addEventListener("load", handleResize);
