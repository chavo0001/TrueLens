// src/components/LoadingScreen.js
import React from "react";
import Lottie from "react-lottie";
import loadingAnimation from "./animations/loading-animation.json";
import "../styles/LoadingScreen.css"; // Assicurati di avere questo file

const LoadingScreen = () => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loadingAnimation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice"
    }
  };

  return (
    <div className="loading-screen">
      <Lottie options={defaultOptions} height={200} width={200} />
      <h1 className="animated-title">TrueLens</h1>
    </div>
  );
};

export default LoadingScreen;
