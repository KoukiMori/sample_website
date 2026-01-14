const toggleBTN = document.querySelector(".toggle_btn");
const toggleBTNIcon = document.querySelector(".toggle_btn i");
const dropDownMenu = document.querySelector(".dropdown_menu");

// トグルボタンをクリックでメニューを開閉
toggleBTN.onclick = function(event) {
    // イベントの伝播を止める（documentのクリックイベントが発火しないように）
    event.stopPropagation();
    dropDownMenu.classList.toggle("open");

    const isOpen = dropDownMenu.classList.contains("open");
    toggleBTNIcon.classList = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
};

// メニュー外をクリックしたらメニューを閉じる
document.addEventListener("click", function(event) {
    // クリックされた要素がメニュー内でなければ閉じる
    const isClickInsideMenu = dropDownMenu.contains(event.target);
    const isClickOnToggle = toggleBTN.contains(event.target);

    if (!isClickInsideMenu && !isClickOnToggle) {
        dropDownMenu.classList.remove("open");
        toggleBTNIcon.classList = "fa-solid fa-bars";
    }
});