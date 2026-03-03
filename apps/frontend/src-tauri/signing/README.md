# Mobile 签名文件放置约定

当 GitHub Secrets 未配置时，CI 会从本目录读取签名文件。

## Android

放置文件：

- `apps/frontend/src-tauri/signing/android/release.keystore`
- `apps/frontend/src-tauri/signing/android/release.keystore.base64`（可选，和 `release.keystore` 二选一）
- `apps/frontend/src-tauri/signing/android/signing.properties`

`signing.properties` 内容示例：

```properties
storePassword=你的_keystore_密码
keyPassword=你的_key_密码
keyAlias=你的_key_alias
```

说明：

- CI 默认优先使用本目录签名文件。
- 本地文件缺失时，才回退到 `ANDROID_*` secrets。
- 支持 secrets：`ANDROID_KEYSTORE_BASE64` 或 `ANDROID_KEYSTORE_FILE_BASE64`。
- 若本目录也缺失，则 Android 签名构建失败。

## iOS

放置文件：

- `apps/frontend/src-tauri/signing/ios/certificate.p12`
- `apps/frontend/src-tauri/signing/ios/profile.mobileprovision`
- `apps/frontend/src-tauri/signing/ios/certificate_password.txt`
- `apps/frontend/src-tauri/signing/ios/development_team.txt`

说明：

- CI 默认优先使用本目录签名文件。
- 本地文件缺失时，才回退到 `IOS_*` secrets。
- `certificate_password.txt` 只放密码明文，不要加额外字符。
- `development_team.txt` 放 Apple Team ID（10 位字母数字），例如 `ABCDE12345`。
