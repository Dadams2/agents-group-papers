import * as auth from "../../auth/api.js";

const updateUI = () => {
    const loginBtn = document.getElementById("login-btn");
    const userInfo = document.getElementById("user-info");
    const userAvatar = document.getElementById("user-avatar");
    const userName = document.getElementById("user-name");

    if (auth.isAuthenticated()) {
        const user = auth.currentUser();
        userAvatar.src = user.picture;
        userName.textContent = user.nickname;
        loginBtn.classList.add("hidden");
        userInfo.classList.remove("hidden");
    } else {
        loginBtn.classList.remove("hidden");
        userInfo.classList.add("hidden");
    }
};

const setupEventListeners = () => {
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");

    loginBtn?.addEventListener("click", () => auth.login());
    logoutBtn?.addEventListener("click", () => auth.logout());
};

setupEventListeners();
updateUI();
