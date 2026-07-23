const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GM_PASSWORD = process.env.GM_PASSWORD || 'latenshift2026!';

const DATA_FILE = path.join(__dirname, 'data', 'updates.json');

// 데이터 디렉터리 및 초기 구조 생성
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        releases: [
            {
                version: "v1.0.0",
                fileId: "",
                date: "2026-07-23",
                patchNotes: {
                    ko: "• Latenshift 최초 정식 버전 출시\n• 시스템 지연 시간(Latency) 최적화 알고리즘 탑재\n• 실시간 백그라운드 프로세스 관리 기능 제공",
                    en: "• Initial official release of Latenshift\n• Latency optimization engine integrated\n• Real-time background process management",
                    ja: "• Latenshift 初の正式リリース\n• システムレイテンシ最適化アルゴリズム搭載\n• リアルタイムバックグラウンドプロセス管理機能",
                    "zh-CN": "• Latenshift 首次正式发布\n• 内置系统延迟优化算法\n• 提供实时后台进程管理功能",
                    "zh-TW": "• Latenshift 首次正式發佈\n• 內建系統延遲優化演算法\n• 提供實時背景程序管理功能"
                }
            }
        ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'latenshift-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 * 12 }
}));

function getUpdateData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveUpdateData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== API 라우트 =====

// 전체 업데이트/아카이브 정보 조회
app.get('/api/info', (req, res) => {
    const data = getUpdateData();
    res.json({
        releases: data.releases,
        isGm: Boolean(req.session.isGm)
    });
});

// GM 로그인
app.post('/api/gm/login', (req, res) => {
    const { password } = req.body;

    // 디버깅용 콘솔 출력
    console.log('[GM Login Attempt] 입력받은 비번:', password, '');
    
    if (password === GM_PASSWORD) {
        req.session.isGm = true;
        return res.json({ success: true });
    }
    res.status(401).json({ success: false, message: 'Invalid password' });
});

// GM 로그아웃
app.post('/api/gm/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// GM 새 배포 등록
app.post('/api/gm/deploy', (req, res) => {
    if (!req.session.isGm) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { version, fileId, patchNotes } = req.body;
    if (!version || !fileId) {
        return res.status(400).json({ success: false, message: 'Version and File ID are required.' });
    }

    let cleanFileId = fileId.trim();
    const match = cleanFileId.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanFileId.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) {
        cleanFileId = match[1];
    }

    const data = getUpdateData();
    const today = new Date().toISOString().split('T')[0];

    const newRelease = {
        version,
        fileId: cleanFileId,
        date: today,
        patchNotes: {
            ko: patchNotes.ko || '• 세부 최적화 및 안정성 향상',
            en: patchNotes.en || '• General optimizations and stability improvements',
            ja: patchNotes.ja || '• 全般的な最適化と安定性の向上',
            "zh-CN": patchNotes["zh-CN"] || '• 常规优化与稳定性提升',
            "zh-TW": patchNotes["zh-TW"] || '• 常規優化與穩定性提升'
        }
    };

    // 최신 버전이 배열의 가장 앞에 오도록 추가
    data.releases.unshift(newRelease);
    saveUpdateData(data);

    res.json({ success: true });
});

// 우회 직접 다운로드 링크
app.get('/download/:fileId', (req, res) => {
    const { fileId } = req.params;
    if (!fileId) return res.status(404).send('File not found.');
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
    res.redirect(directUrl);
});

app.listen(PORT, () => {
    console.log(`[Latenshift] Hub running on http://localhost:${PORT}`);
});