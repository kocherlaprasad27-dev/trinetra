document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  try {
    console.log("📡 Calling login API...");

    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: data
    });

    console.log("✅ Login success:", result);
  } catch (err) {
    console.error("❌ Login failed:", err.message || err);
  }
});
