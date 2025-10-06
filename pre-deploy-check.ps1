# 大富豪オンライン - デプロイ前チェック (PowerShell)

Write-Host "🚀 大富豪オンライン - デプロイ前チェック" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PASS = 0
$FAIL = 0
$WARN = 0

function Check-Pass {
    param($message)
    Write-Host "✓ $message" -ForegroundColor Green
    $script:PASS++
}

function Check-Fail {
    param($message)
    Write-Host "✗ $message" -ForegroundColor Red
    $script:FAIL++
}

function Check-Warn {
    param($message)
    Write-Host "⚠ $message" -ForegroundColor Yellow
    $script:WARN++
}

# 1. 依存関係のチェック
Write-Host "📦 1. 依存関係のチェック" -ForegroundColor Cyan
Write-Host "---"

# Node.js確認
try {
    $nodeVersion = node -v
    Check-Pass "Node.js: $nodeVersion"
} catch {
    Check-Fail "Node.jsがインストールされていません"
}

# npm確認
try {
    $npmVersion = npm -v
    Check-Pass "npm: $npmVersion"
} catch {
    Check-Fail "npmがインストールされていません"
}

Write-Host ""

# 2. PWAアイコンのチェック
Write-Host "🎨 2. PWAアイコンのチェック" -ForegroundColor Cyan
Write-Host "---"

$icons = @(
    "icon-72x72.png",
    "icon-96x96.png",
    "icon-128x128.png",
    "icon-144x144.png",
    "icon-152x152.png",
    "icon-192x192.png",
    "icon-384x384.png",
    "icon-512x512.png"
)

$iconCount = 0
foreach ($icon in $icons) {
    if (Test-Path "frontend\public\$icon") {
        $iconCount++
    }
}

if ($iconCount -eq 8) {
    Check-Pass "すべてのPWAアイコンが存在します ($iconCount/8)"
} elseif ($iconCount -gt 0) {
    Check-Warn "一部のPWAアイコンが不足しています ($iconCount/8)"
} else {
    Check-Fail "PWAアイコンが配置されていません (0/8)"
}

# manifest.json確認
if (Test-Path "frontend\public\manifest.json") {
    Check-Pass "manifest.json が存在します"
} else {
    Check-Fail "manifest.json が見つかりません"
}

Write-Host ""

# 3. ビルドチェック
Write-Host "🔧 3. ビルドチェック" -ForegroundColor Cyan
Write-Host "---"

# フロントエンドビルド
Write-Host "フロントエンドをビルド中..." -NoNewline
Push-Location frontend
try {
    npm run build 2>&1 | Out-Null
    Write-Host ""
    Check-Pass "フロントエンドビルド成功"
} catch {
    Write-Host ""
    Check-Fail "フロントエンドビルド失敗"
}
Pop-Location

# バックエンドビルド
Write-Host "バックエンドをビルド中..." -NoNewline
Push-Location backend
try {
    npm run build 2>&1 | Out-Null
    Write-Host ""
    Check-Pass "バックエンドビルド成功"
} catch {
    Write-Host ""
    Check-Fail "バックエンドビルド失敗"
}
Pop-Location

Write-Host ""

# 4. 環境変数のチェック
Write-Host "📝 4. 環境変数のチェック" -ForegroundColor Cyan
Write-Host "---"

# バックエンド環境変数
if (Test-Path "backend\.env") {
    Check-Pass "backend\.env が存在します"
    
    $envContent = Get-Content "backend\.env" -Raw
    if ($envContent -match "JWT_SECRET=your-super-secret-jwt-key") {
        Check-Warn "JWT_SECRETがデフォルト値です（本番環境では変更してください）"
    } else {
        Check-Pass "JWT_SECRETが設定されています"
    }
} else {
    Check-Fail "backend\.env が見つかりません"
}

# フロントエンド環境変数
if ((Test-Path "frontend\.env.production") -or (Test-Path "frontend\.env.local")) {
    Check-Pass "フロントエンド環境変数ファイルが存在します"
} else {
    Check-Warn "フロントエンド環境変数ファイルが見つかりません"
}

Write-Host ""

# 5. データベースのチェック
Write-Host "📊 5. データベースのチェック" -ForegroundColor Cyan
Write-Host "---"

if (Test-Path "backend\database\schema.sql") {
    Check-Pass "データベーススキーマが存在します"
} else {
    Check-Fail "データベーススキーマが見つかりません"
}

if (Test-Path "backend\database\optimize.sql") {
    Check-Pass "データベース最適化スクリプトが存在します"
} else {
    Check-Warn "データベース最適化スクリプトが見つかりません"
}

Write-Host ""

# 6. セキュリティチェック
Write-Host "🔐 6. セキュリティチェック" -ForegroundColor Cyan
Write-Host "---"

if (Test-Path ".gitignore") {
    Check-Pass ".gitignore が存在します"
    
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Check-Pass ".envファイルが.gitignoreに含まれています"
    } else {
        Check-Warn ".envファイルを.gitignoreに追加してください"
    }
} else {
    Check-Warn ".gitignore が見つかりません"
}

if (Test-Path "node_modules") {
    Check-Warn "ルートのnode_modulesが存在します（削除推奨）"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 チェック結果サマリー" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "合格: $PASS" -ForegroundColor Green
Write-Host "警告: $WARN" -ForegroundColor Yellow
Write-Host "失敗: $FAIL" -ForegroundColor Red
Write-Host ""

if ($FAIL -eq 0) {
    if ($WARN -eq 0) {
        Write-Host "✨ すべてのチェックに合格しました！デプロイ準備完了です！" -ForegroundColor Green
        Write-Host ""
        Write-Host "次のステップ:"
        Write-Host "1. PWAアイコンを frontend\public\ に配置（まだの場合）"
        Write-Host "2. 環境変数を本番環境用に設定"
        Write-Host "3. DEPLOY.md を参照してデプロイ"
        exit 0
    } else {
        Write-Host "⚠ 警告がありますが、デプロイ可能です" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "推奨事項:"
        Write-Host "- PWAアイコンをすべて配置"
        Write-Host "- JWT_SECRETを強力なものに変更"
        Write-Host "- 環境変数ファイルを確認"
        exit 0
    }
} else {
    Write-Host "❌ 失敗項目があります。修正してください" -ForegroundColor Red
    Write-Host ""
    Write-Host "DEPLOY.md を参照して問題を解決してください"
    exit 1
}

