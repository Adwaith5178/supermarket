import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="dynamic-bg">
            {/* Overlay to ensure text readability */}
            <div style={styles.overlay}>
                <h1 style={styles.title}>
                    FreshMart <span style={styles.accent}>Smart Portal</span>
                </h1>
                <p style={styles.subtitle}>Intelligent Pricing • Fresh Quality • Seamless Shopping</p>
                
                <div style={styles.cardContainer}>
                    {/* ADMIN CARD */}
                    <div 
                        style={styles.card} 
                        onClick={() => navigate("/login?role=admin")}
                        className="portal-card"
                    >
                        <div className="floating-icon" style={styles.iconWrapper}>👨‍💼</div>
                        <h2 style={styles.cardTitle}>Admin Portal</h2>
                        <p style={styles.cardDesc}>Control inventory levels and manage AI pricing triggers.</p>
                        <div style={styles.cardBadge}>Staff Access</div>
                    </div>

                    {/* CUSTOMER CARD */}
                    <div 
                        style={styles.card} 
                        onClick={() => navigate("/login?role=customer")}
                        className="portal-card"
                    >
                        <div className="floating-icon" style={styles.iconWrapper}>🛒</div>
                        <h2 style={styles.cardTitle}>Customer Shop</h2>
                        <p style={styles.cardDesc}>Explore the aisles and catch live dynamic price drops.</p>
                        <div style={styles.cardBadge}>Public Access</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        zIndex: 5,
        padding: "20px",
    },
    title: {
        fontSize: "4rem",
        color: "white",
        fontWeight: "900",
        marginBottom: "10px",
        textShadow: "0 10px 20px rgba(0,0,0,0.3)"
    },
    accent: {
        color: "#38bdf8",
    },
    subtitle: {
        color: "#cbd5e1",
        fontSize: "1.1rem",
        marginBottom: "60px",
        letterSpacing: "1px"
    },
    cardContainer: {
        display: "flex",
        gap: "40px",
        justifyContent: "center",
        flexWrap: "wrap"
    },
    card: {
        background: "rgba(255, 255, 255, 0.07)",
        backdropFilter: "blur(15px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "40px",
        borderRadius: "30px",
        width: "320px",
        cursor: "pointer",
        transition: "all 0.5s ease",
    },
    iconWrapper: {
        fontSize: "5rem",
        marginBottom: "20px",
    },
    cardTitle: {
        fontSize: "1.8rem",
        color: "white",
        margin: "10px 0",
    },
    cardDesc: {
        color: "#94a3b8",
        fontSize: "0.95rem",
        lineHeight: "1.5",
        marginBottom: "20px"
    },
    cardBadge: {
        display: "inline-block",
        padding: "5px 15px",
        borderRadius: "20px",
        backgroundColor: "rgba(56, 189, 248, 0.2)",
        color: "#38bdf8",
        fontSize: "0.8rem",
        fontWeight: "bold"
    }
};