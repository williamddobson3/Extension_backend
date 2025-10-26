# 🔧 LINE Broadcast Troubleshooting Guide

## 🎯 **問題: ブロードキャストメッセージが送信されない**

LINE公式アカウントからブロードキャストメッセージが友だちに届かない場合の診断と解決方法。

---

## 📋 **診断ステップ**

### **Step 1: テストスクリプトを実行**

```bash
cd Extension_backend
node test-line-broadcast.js
```

このスクリプトは以下をテストします：
- ✅ Bot情報の取得
- ✅ クォータ情報の取得
- ✅ ブロードキャストメッセージの送信

---

## 🔍 **一般的な問題と解決方法**

### **1. 友だちが0人の場合**

**問題**: ブロードキャストは友だちがいないと送信できません。

**解決方法**:
1. LINE公式アカウントを友だち追加する
2. QRコードをスキャン: `friend.png`
3. または、リンクから追加: https://lin.ee/61Qp02m

**確認方法**:
```bash
# LINE Developers Consoleで友だち数を確認
# https://developers.line.biz/console/
```

---

### **2. ブロードキャストAPIが無効**

**問題**: チャンネルのプランによってはブロードキャストAPIが使えない場合があります。

**解決方法**:
1. LINE Developers Consoleにログイン
2. チャンネル設定を確認
3. Messaging API設定で「ブロードキャスト」が有効か確認

**代替案**: Multicast APIを使用
```javascript
// Multicast API (特定のユーザーに送信)
POST https://api.line.me/v2/bot/message/multicast
{
  "to": ["USER_ID_1", "USER_ID_2"],
  "messages": [...]
}
```

---

### **3. メッセージ送信制限**

**問題**: 無料プランでは月500通までの制限があります。

**確認方法**:
```bash
# クォータを確認
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.line.me/v2/bot/message/quota
```

**解決方法**:
- 有料プランにアップグレード
- または、Narrowcast APIを使用（ターゲット配信）

---

### **4. アクセストークンの問題**

**問題**: アクセストークンが無効または期限切れ。

**解決方法**:
1. `.env`ファイルを確認
```env
LINE_CHANNEL_ACCESS_TOKEN=wC2ad1cBncKnmQ+oQwAZEwkQA/mktCaAccMdFYK1HeYhpKwVohZrfGvEOeS4l1By3sSlo2dpw8EpI4GyXoQpunqB35GfV2Uc86PEXm7/tqnV4woeC29Rl/iMuzaKQHusZ9pPhY/6Xi/zOs+8fFnNjQdB04t89/1O/w1cDnyilFU=
LINE_CHANNEL_SECRET=21c0e68ea4b687bcd6f13f60485d69ce
LINE_CHANNEL_ID=2007999524
```

2. トークンが正しいか確認
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.line.me/v2/bot/info
```

---

### **5. Webhook設定の問題**

**問題**: Webhookが正しく設定されていない。

**解決方法**:
1. LINE Developers Consoleで確認
2. Webhook URLを設定（必要な場合）
3. Webhookを有効化

**注意**: ブロードキャストにはWebhookは必須ではありませんが、双方向通信には必要です。

---

## 🚀 **推奨される実装方法**

### **方法1: ブロードキャスト（全友だちに送信）**

```javascript
// 全友だちに送信
POST /api/broadcast/test-channel
```

**メリット**:
- ✅ シンプル
- ✅ 全友だちに一斉送信

**デメリット**:
- ❌ 月500通制限（無料プラン）
- ❌ 友だちが0人だと送信できない

---

### **方法2: Multicast（特定ユーザーに送信）**

```javascript
// データベースから全ユーザーのLINE IDを取得
const users = await getAllUsersWithLineId();
const userIds = users.map(u => u.line_user_id);

// Multicast送信（最大500人まで）
POST https://api.line.me/v2/bot/message/multicast
{
  "to": userIds,
  "messages": [...]
}
```

**メリット**:
- ✅ 特定のユーザーに送信可能
- ✅ より柔軟な制御

**デメリット**:
- ❌ 一度に最大500人まで
- ❌ ユーザーIDの管理が必要

---

### **方法3: Push（個別送信）**

```javascript
// 各ユーザーに個別送信
for (const user of users) {
  POST https://api.line.me/v2/bot/message/push
  {
    "to": user.line_user_id,
    "messages": [...]
  }
}
```

**メリット**:
- ✅ 個別にカスタマイズ可能
- ✅ エラーハンドリングが容易

**デメリット**:
- ❌ APIコール数が多い
- ❌ レート制限に注意

---

## 🔧 **現在の実装を修正する**

### **オプション1: ブロードキャストを継続使用**

**前提条件**:
1. 友だちが1人以上いる
2. ブロードキャストAPIが有効
3. 月間送信数が制限内

**確認コマンド**:
```bash
node test-line-broadcast.js
```

---

### **オプション2: Multicastに切り替え**

新しいエンドポイントを作成:

```javascript
// routes/broadcast.js に追加
router.post('/multicast', async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        
        // データベースから全ユーザーのLINE IDを取得
        const [users] = await pool.execute(
            'SELECT line_user_id FROM users WHERE line_enabled = 1 AND line_user_id IS NOT NULL'
        );
        
        if (users.length === 0) {
            return res.json({
                success: false,
                message: 'No users with LINE enabled'
            });
        }
        
        const userIds = users.map(u => u.line_user_id);
        
        // Multicast送信（最大500人まで）
        const chunks = [];
        for (let i = 0; i < userIds.length; i += 500) {
            chunks.push(userIds.slice(i, i + 500));
        }
        
        const results = [];
        for (const chunk of chunks) {
            const response = await axios.post(
                'https://api.line.me/v2/bot/message/multicast',
                {
                    to: chunk,
                    messages: [{
                        type: 'text',
                        text: req.body.message || 'テストメッセージ'
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${channelAccessToken}`
                    }
                }
            );
            results.push(response.data);
        }
        
        res.json({
            success: true,
            message: `Sent to ${userIds.length} users`,
            results
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

---

## 📊 **ブロードキャスト統計を確認**

```bash
# 統計APIを呼び出し
curl http://localhost:3003/api/broadcast/stats
```

または、ブラウザで:
```
http://localhost:3003/api/broadcast/stats
```

---

## ✅ **チェックリスト**

実装前に以下を確認:

- [ ] LINE公式アカウントに友だちが1人以上いる
- [ ] `.env`にアクセストークンが正しく設定されている
- [ ] サーバーが起動している (`npm start`)
- [ ] ブロードキャストルートが登録されている
- [ ] テストスクリプトが成功する (`node test-line-broadcast.js`)
- [ ] LINE Developers Consoleでブロードキャストが有効
- [ ] 月間送信数が制限内

---

## 🎯 **次のステップ**

1. **テストスクリプトを実行**:
   ```bash
   node test-line-broadcast.js
   ```

2. **エラーログを確認**:
   - サーバーのコンソール出力を確認
   - エラーメッセージを記録

3. **必要に応じて実装を変更**:
   - ブロードキャストが使えない場合 → Multicastに切り替え
   - 友だちが0人の場合 → 友だち追加を促進

4. **サーバーを再起動**:
   ```bash
   npm start
   ```

5. **Extensionでテスト**:
   - LINEテストボタンをクリック
   - LINE appでメッセージを確認

---

## 📱 **サポート**

問題が解決しない場合:
1. サーバーログを確認
2. LINE Developers Consoleを確認
3. `test-line-broadcast.js`の出力を確認

