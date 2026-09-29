const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'

const glados = async () => {
  const notice = []
  if (!process.env.GLADOS) {
    console.log('⚠️ 未设置 GLADOS secret，跳过签到')
    return notice
  }
  for (const cookie of String(process.env.GLADOS).split('\n')) {
    if (!cookie.trim()) continue
    try {
      const common = {
        'cookie': cookie.trim(),
        'referer': 'https://glados.cloud/console/checkin',
        'origin': 'https://glados.cloud',
        'user-agent': UA,
      }
      const action = await fetch('https://glados.cloud/api/user/checkin', {
        method: 'POST',
        headers: { ...common, 'content-type': 'application/json' },
        body: '{"token":"glados.cloud"}',
      }).then((r) => r.json())
      // code 0 = 签到成功, code 1 = 今日已签到，均视为成功
      if (action?.code !== 0 && action?.code !== 1) {
        throw new Error(`code=${action?.code} ${action?.message || 'unknown'} ${action?.reason || ''}`.trim())
      }
      const status = await fetch('https://glados.cloud/api/user/status', {
        method: 'GET',
        headers: { ...common },
      }).then((r) => r.json())
      if (status?.code) throw new Error(status?.message)
      console.log(`✅ GLADOS签到成功 - ${action?.message}, 剩余 ${status?.data?.leftDays} 天`)
    } catch (error) {
      console.error(`❌ GLADOS签到失败 - ${error}`)
      notice.push(`❌ GLADOS签到失败`, `原因: ${error}`)
    }
  }
  return notice
}

const notify = async (notice) => {
  if (!process.env.NOTIFY || !notice || notice.length === 0) return
  for (const option of String(process.env.NOTIFY).split('\n')) {
    if (!option) continue
    try {
      if (option.startsWith('pushplus:')) {
        await fetch(`https://www.pushplus.plus/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: option.split(':')[1],
            title: notice[0],
            content: notice.join('<br>'),
            template: 'markdown',
          }),
        })
      }
    } catch (error) {
      console.error(`通知发送失败: ${error}`)
    }
  }
}

const main = async () => {
  const notice = await glados()
  await notify(notice)
  if (notice.length > 0) {
    process.exitCode = 1
  }
}

main()
