/**
 * 账户工具
 * 用于生成和管理用户账户信息
 */

/**
 * 生成随机用户 ID（类似微信号）
 * 格式：字母开头 + 字母数字组合，8-16位
 */
export function generateUserId(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const alphanumeric = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const length = Math.floor(Math.random() * 9) + 8 // 8-16位

    // 第一个字符必须是字母
    let id: string = letters[Math.floor(Math.random() * letters.length)]!

    // 剩余字符可以是字母或数字
    for (let i = 1; i < length; i++) {
        id += alphanumeric[Math.floor(Math.random() * alphanumeric.length)]!
    }

    return id
}

/**
 * 生成随机中文姓名
 */
export function generateChineseName(): { firstName: string; lastName: string } {
    const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗']
    const firstNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '秀兰', '霞', '平']

    const lastName: string = surnames[Math.floor(Math.random() * surnames.length)]!
    const firstName: string = firstNames[Math.floor(Math.random() * firstNames.length)]!

    return { firstName, lastName }
}

/**
 * 生成随机英文姓名
 */
export function generateEnglishName(): { firstName: string; lastName: string } {
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

    const firstName: string = firstNames[Math.floor(Math.random() * firstNames.length)]!
    const lastName: string = lastNames[Math.floor(Math.random() * lastNames.length)]!

    return { firstName, lastName }
}

/**
 * 生成默认头像（使用 DiceBear API 或本地生成）
 */
export function generateAvatar(seed: string): string {
    // 使用 DiceBear Avatars API 生成头像
    // 可以选择不同的风格：avataaars, bottts, identicon, etc.
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

/**
 * 生成随机密码
 */
export function generatePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'
    const allChars = uppercase + lowercase + numbers + symbols

    let password = ''
    // 确保至少包含一个大写、小写、数字和符号
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]

    // 填充剩余长度
    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // 打乱顺序
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * 验证用户 ID 格式
 */
export function validateUserId(userId: string): boolean {
    // ID必须：字母开头，只包含字母和数字，长度8-16位
    const regex = /^[a-z][a-z0-9]{7,15}$/i
    return regex.test(userId)
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): { valid: boolean; strength: 'weak' | 'medium' | 'strong'; message: string } {
    if (password.length < 8) {
        return { valid: false, strength: 'weak', message: '密码至少需要8个字符' }
    }

    let strength = 0
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength < 3) {
        return { valid: true, strength: 'weak', message: '密码强度：弱' }
    } else if (strength === 3) {
        return { valid: true, strength: 'medium', message: '密码强度：中等' }
    } else {
        return { valid: true, strength: 'strong', message: '密码强度：强' }
    }
}
