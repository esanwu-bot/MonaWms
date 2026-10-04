"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";

const NAV_LINKS = [
  { href: "#pain", label: "为什么" },
  { href: "#features", label: "核心能力" },
  { href: "#modules", label: "功能模块" },
  { href: "#stack", label: "技术架构" },
  { href: "#deploy", label: "部署方式" },
  { href: "#faq", label: "常见问题" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="#top">
          <BrandLogo />
          Mona<b>WMS</b>
        </a>
        <nav
          className={`nav-links${open ? " open" : ""}`}
          aria-label="主导航"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          className="btn btn-primary nav-cta"
          href="http://8.152.97.191:9110/login"
          target="_blank"
          rel="noopener noreferrer"
        >
          在线演示
        </a>
        <button
          className="nav-burger"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "关闭菜单" : "打开菜单"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}
