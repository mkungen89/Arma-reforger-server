import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function EnvironmentBanner() {
  const [env, setEnv] = useState(null);

  useEffect(() => {
    let alive = true;
    axios.get('/api/env')
      .then((r) => {
        if (alive) setEnv(r.data);
      })
      .catch(() => {
        // ignore
      });
    return () => { alive = false; };
  }, []);

  if (!env?.config?.windowsPathOnLinux) return null;

  return (
    <div className="alert alert-warning" style={{ margin: '0 0 15px 0' }}>
      <div style={{ fontWeight: 700, marginBottom: '4px' }}>Docker/Linux detected, but config uses Windows paths</div>
      <div style={{ fontSize: '13px' }}>
        Your <code>serverPath</code>/<code>steamCmdPath</code> are set to <code>C:\...</code>, so <b>Start/Update</b> will fail inside Docker.
        Fix it in <Link to="/config">Configuration</Link> (use Linux paths like <code>/opt/arma-reforger</code> and <code>/usr/games/steamcmd</code>).
      </div>
    </div>
  );
}


