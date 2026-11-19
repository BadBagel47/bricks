import { useEffect, useRef, useState } from 'react'
import { qrSvg } from '../../vendor/network-kit/client/share.js'

/** F-039: a QR code of the invite link, so a friend can join with the phone camera. Used by both 2 Players versions. */
export function InviteQr({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (open) close.current?.focus() }, [open])
  return <>
    <button className="back-button" aria-expanded={open} onClick={() => setOpen(value => !value)}>QR Code</button>
    {open && <div className="invite-qr" role="group" aria-label="Invite QR code">
      <div className="invite-qr-code" dangerouslySetInnerHTML={{ __html: qrSvg(url, { title: 'Invite link QR code' }) }} />
      <button ref={close} className="back-button" onClick={() => setOpen(false)}>Close</button>
    </div>}
  </>
}
