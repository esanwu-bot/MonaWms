"use client";

import { useState, useCallback, useRef } from "react";
import { Check, ExternalLink } from "lucide-react";

const DEMO_URL = "http://8.152.97.191:9110/login";
const ACCOUNTS = [
  { role: "管理员", account: "admin / password", copy: "admin / password" },
  { role: "录入员", account: "operator / password", copy: "operator / password" },
];

export default function Demo() {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`已复制账号：${text}`);
    } catch {
      showToast("复制失败，请手动输入账号");
    }
  };

  return (
    <section className="demo" id="demo">
      <div className="wrap">
        <div className="sec-head">
          <span className="kicker">Live Demo</span>
          <h2>三十秒，亲眼看看「账实一致」</h2>
          <p>无需安装，直接用浏览器体验完整业务流程：录单、过账、盘点、对账、查审计。</p>
        </div>
        <div className="demo-box">
          <div className="demo-addr">{DEMO_URL}</div>
          <div className="demo-acc">
            {ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                className="acc-chip"
                type="button"
                onClick={() => copyText(acc.copy)}
              >
                <b>{acc.role}</b>
                <span>{acc.account}</span>
              </button>
            ))}
          </div>
          <a
            className="btn btn-primary"
            href={DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: 8 }}
          >
            打开在线演示
            <ExternalLink size={15} />
          </a>
          <p className="demo-tip">
            演示环境为共享实例，请勿录入真实业务数据；管理员登录后可在「用户管理」修改密码。点击账号卡片可复制。
          </p>
        </div>
      </div>
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast && (
          <>
            <Check size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            {toast}
          </>
        )}
      </div>
    </section>
  );
}
