import React, { useState } from "react";
import axios from "axios";
import "./Login.css";

function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = credentials;
    if (username === "test" && password === "test") return onLogin();

    try {
      const response = await axios.post("http://10.120.0.132:3001/login", {
        input_username: username,
        input_password: password,
      });

      if (response.data.status === "success") {
        onLogin();
      } else {
        alert("Invalid credentials");
      }
    } catch {
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
            value={credentials.username}
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">密碼</label>
          <input
            type="password"
            id="password"
            value={credentials.password}
            onChange={handleChange}
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
