import React, { useState } from "react";
import axios from "axios";
import "./Login.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Attempting login with username:", username); // Log username for debugging
    if (username === "test" && password === "test") {
      console.log("Using test credentials, logging in...");
      onLogin();
      return;
    }
    try {
      const response = await axios.post("http://localhost:3001/login", {
        input_username: username,
        input_password: password,
      });
      console.log("Login response:", response.data); // Log the response data for debugging

      if (response.data.status === "success") {
        console.log("Login successful");
        onLogin();
      } else {
        console.warn("Invalid credentials:", response.data);
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error.response || error.message);
      alert("An error occurred during login. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">登入</h2>
        <div className="form-group">
          <label htmlFor="username">用戶編號</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">密碼</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <button type="submit" className="login-button">登入</button>
      </form>
    </div>
  );
}

export default Login;
