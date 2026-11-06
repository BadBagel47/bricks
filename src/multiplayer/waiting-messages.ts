export const WAITING_MESSAGES: readonly string[] = [
  "The host is negotiating with gravity.",
  "The T-piece insists it's the main character.",
  "The I-piece is late. Again.",
  "The O-piece thinks rotation is overrated.",
  "The Z-piece refuses to fit anywhere.",
  "The S-piece claims the Z-piece started it.",
  "The L-piece took a wrong turn.",
  "The J-piece is still looking for its other half.",
  "The next piece knows something you don't.",
  "The blocks promise to behave this time. Probably.",
  "The host is searching for the perfect starting level.",
  "A four-line clear is practicing its victory pose.",
  "The bottom row is expecting company.",
  "The top row is getting a little nervous.",
  "The left wall is blaming the right wall.",
  "The right arrow suspects the left arrow of cheating.",
  "Button A and Button B disagree on directions.",
  "The D-pad is warming up for a serious workout.",
  "The Hold slot wants another chance.",
  "The soft drop button is getting impatient.",
  "The blocks are practicing synchronized falling.",
  "The host is checking if the I-piece is still straight.",
  "The line counter is preparing for overtime.",
  "A lonely gap is waiting for the perfect piece.",
  "The next-piece preview is trying not to spoil the surprise.",
  "The blocks are arguing about who falls first.",
  "The scoreboard is preparing some very large numbers.",
  "A T-piece is planning an unnecessarily complicated landing.",
  "The host is deciding how much chaos is appropriate.",
  "The stack is practicing its balancing act.",
  "The penalty rows are sharpening their corners.",
  "The blocks have been warned about suspicious gaps.",
  "The host is checking both players received the same pieces.",
  "The O-piece is feeling unusually well-rounded.",
  "A perfect landing has been postponed indefinitely.",
  "The game board is pretending there's plenty of room.",
  "The I-piece is demanding a four-row welcome.",
  "The rotation button is training for its big moment.",
  "The next line clear has already claimed victory.",
  "The blocks are trying to remember which way is down.",
  "The host is testing the limits of your patience meter.",
  "The random piece generator looks suspiciously innocent.",
  "The countdown is stretching its five seconds.",
  "The score duel is preparing for a very square showdown.",
  "A suspicious gap has appeared in row nineteen.",
  "The pieces are rehearsing a spectacular misdrop.",
  "The I-piece is refusing to arrive when needed.",
  "The host is deciding whether mercy is a game mechanic.",
  "Your future high score is currently under construction.",
  "The blocks are ready. The host is another story."
]

export class WaitingMessages {
  private lastMessage: string | null = null
  current(): string { return this.lastMessage ?? this.next() }
  private remaining: number[] = []
  private recent: number[] = []
  private readonly random: () => number
  constructor(random: () => number = Math.random) { this.random = random }
  next(): string {
    if (!this.remaining.length) {
      const deck = WAITING_MESSAGES.map((_, i) => i)
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
      const opening = deck.filter(i => !this.recent.includes(i)).slice(0, 5)
      this.remaining = [...opening, ...deck.filter(i => !opening.includes(i))]
    }
    const index = this.remaining.shift()!
    this.recent = [...this.recent, index].slice(-5)
    this.lastMessage = WAITING_MESSAGES[index]
    return this.lastMessage
  }
}
