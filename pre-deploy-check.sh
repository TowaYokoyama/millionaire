#!/bin/bash

echo "🚀 大富豪オンライン - デプロイ前チェック"
echo "=========================================="
echo ""

# カラーコード
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック項目のカウント
PASS=0
FAIL=0
WARN=0

# 関数定義
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "📦 1. 依存関係のチェック"
echo "---"

# Node.jsバージョン確認
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js: $NODE_VERSION"
else
    check_fail "Node.jsがインストールされていません"
fi

# npmバージョン確認
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm: $NPM_VERSION"
else
    check_fail "npmがインストールされていません"
fi

echo ""
echo "🎨 2. PWAアイコンのチェック"
echo "---"

# PWAアイコンの存在確認
ICONS=("icon-72x72.png" "icon-96x96.png" "icon-128x128.png" "icon-144x144.png" "icon-152x152.png" "icon-192x192.png" "icon-384x384.png" "icon-512x512.png")

ICON_COUNT=0
for icon in "${ICONS[@]}"; do
    if [ -f "frontend/public/$icon" ]; then
        ((ICON_COUNT++))
    fi
done

if [ $ICON_COUNT -eq 8 ]; then
    check_pass "すべてのPWAアイコンが存在します ($ICON_COUNT/8)"
elif [ $ICON_COUNT -gt 0 ]; then
    check_warn "一部のPWAアイコンが不足しています ($ICON_COUNT/8)"
else
    check_fail "PWAアイコンが配置されていません (0/8)"
fi

# manifest.jsonの確認
if [ -f "frontend/public/manifest.json" ]; then
    check_pass "manifest.json が存在します"
else
    check_fail "manifest.json が見つかりません"
fi

echo ""
echo "🔧 3. ビルドチェック"
echo "---"

# フロントエンドビルド
echo "フロントエンドをビルド中..."
cd frontend
if npm run build > /dev/null 2>&1; then
    check_pass "フロントエンドビルド成功"
else
    check_fail "フロントエンドビルド失敗"
fi
cd ..

# バックエンドビルド
echo "バックエンドをビルド中..."
cd backend
if npm run build > /dev/null 2>&1; then
    check_pass "バックエンドビルド成功"
else
    check_fail "バックエンドビルド失敗"
fi
cd ..

echo ""
echo "📝 4. 環境変数のチェック"
echo "---"

# バックエンド環境変数
if [ -f "backend/.env" ]; then
    check_pass "backend/.env が存在します"
    
    # JWT_SECRET確認
    if grep -q "JWT_SECRET=your-super-secret-jwt-key" backend/.env 2>/dev/null; then
        check_warn "JWT_SECRETがデフォルト値です（本番環境では変更してください）"
    else
        check_pass "JWT_SECRETが設定されています"
    fi
else
    check_fail "backend/.env が見つかりません"
fi

# フロントエンド環境変数
if [ -f "frontend/.env.production" ] || [ -f "frontend/.env.local" ]; then
    check_pass "フロントエンド環境変数ファイルが存在します"
else
    check_warn "フロントエンド環境変数ファイルが見つかりません"
fi

echo ""
echo "📊 5. データベースのチェック"
echo "---"

if [ -f "backend/database/schema.sql" ]; then
    check_pass "データベーススキーマが存在します"
else
    check_fail "データベーススキーマが見つかりません"
fi

if [ -f "backend/database/optimize.sql" ]; then
    check_pass "データベース最適化スクリプトが存在します"
else
    check_warn "データベース最適化スクリプトが見つかりません"
fi

echo ""
echo "🔐 6. セキュリティチェック"
echo "---"

# .gitignore確認
if [ -f ".gitignore" ]; then
    check_pass ".gitignore が存在します"
    
    if grep -q "\.env" .gitignore 2>/dev/null; then
        check_pass ".envファイルが.gitignoreに含まれています"
    else
        check_warn ".envファイルを.gitignoreに追加してください"
    fi
else
    check_warn ".gitignore が見つかりません"
fi

# node_modules確認
if [ -d "node_modules" ]; then
    check_warn "ルートのnode_modulesが存在します（削除推奨）"
fi

echo ""
echo "=========================================="
echo "📊 チェック結果サマリー"
echo "=========================================="
echo -e "${GREEN}合格: $PASS${NC}"
echo -e "${YELLOW}警告: $WARN${NC}"
echo -e "${RED}失敗: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    if [ $WARN -eq 0 ]; then
        echo -e "${GREEN}✨ すべてのチェックに合格しました！デプロイ準備完了です！${NC}"
        echo ""
        echo "次のステップ:"
        echo "1. PWAアイコンを frontend/public/ に配置（まだの場合）"
        echo "2. 環境変数を本番環境用に設定"
        echo "3. DEPLOY.md を参照してデプロイ"
        exit 0
    else
        echo -e "${YELLOW}⚠ 警告がありますが、デプロイ可能です${NC}"
        echo ""
        echo "推奨事項:"
        echo "- PWAアイコンをすべて配置"
        echo "- JWT_SECRETを強力なものに変更"
        echo "- 環境変数ファイルを確認"
        exit 0
    fi
else
    echo -e "${RED}❌ 失敗項目があります。修正してください${NC}"
    echo ""
    echo "DEPLOY.md を参照して問題を解決してください"
    exit 1
fi

