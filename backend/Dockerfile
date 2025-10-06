# Node.js 20 Alpine イメージを使用
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./
COPY tsconfig.json ./

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ポート3001を公開
EXPOSE 3001

# 本番モードで起動
CMD ["npm", "start"]

