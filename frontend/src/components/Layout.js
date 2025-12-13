  import React from "react";
  import { Outlet } from "react-router-dom";
  import Sidebar from "./Sidebar";
  import Navbar from "./Navbar";
  import "../styles/Layout.css";

  const Layout = ({ isSidebarOpen, toggleSidebar }) => {
    return (
      <>
        <Navbar withSidebar={isSidebarOpen} toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="layout-container">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <main className={`main-content ${!isSidebarOpen ? "full-width" : ""}`}>
      <Outlet />
      </main>
        </div>
      </>
    );
  };

  export default Layout;
