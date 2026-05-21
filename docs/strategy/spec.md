**Handbook**  
A reasoning-memory layer for financial decisions. Handbook stores the why behind a user’s financial judgment calls, as a byproduct of a conversation with Claude, and surfaces it when the user asks. The financial decisions live in one source, not scattered across chats. 

**Problem**  
A filer can spend hours on a single judgment call when filing for taxes. By the time they’ve reached the decision, they are exhausted. Notes capture the conclusion ("took the home office deduction") and perhaps a one-sentence blurb on why the decision was made, but may lack the rich context around it. A year later the same person either reconstructs the reasoning from scratch or may repeat the choice without re-examining.

**Core Bet**  
Structured reasoning capture has always been possible in principle and unused in practice, because of the required effort. So the reasoning stays in the person's head and decays.

**LLMs remove the capture cost.** Reasoning can be recorded in natural language, in the user's own words, as a byproduct of a conversation they were having with Claude. Capture becomes a one-tap confirmation.

**Key user journey**  
**Target user**: The sophisticated DIY tax filer who reads IRS guidance directly while concurrently chatting with multiple Claude instances on the best call.

1. The user is preparing their return and needs to make a decision.   
2. In Claude, with the Handbook connector active, they work through alternatives, considerations, and the IRS guidance they're relying on.   
3. Having articulated the reasoning, Claude offers to save it to the Handbook. The user confirms.  
4. The entry is written to the connector store and materialized as a plain-markdown file in Claude CoWork.  
5. At the next filing, the user reaches the same kind of decision. Claude queries the Handbook, finds last year's entry, and summarizes the reasoning so the user revisits a real prior judgment.

**Success metrics**  
**Monetization:** If bundled in accounting software, Handbook is a retention play. The filer who builds up a few years of their own reasoning has a compounding, personal reason to refile in the same product. 

Primary 

* Year-over-year retention rate for Handbook users vs. base (target: \+5pp).

Capture health (leading indicators)

* Save-offer acceptance rate: *of the saves Claude offers, how many the user confirms. Too low suggests bad timing; very high may signal reflexive confirmation.*  
* % of saved entries the user later edits or annotates: *proxy for felt ownership.*

Retrieval value

* At a re-encountered decision, whether a relevant prior entry was surfaced.

**What we're not doing**

*Agentic follow-ups after a save.* Many tax decisions have a time-sensitive tail. An amendment carries a §6511 backstop (roughly three years from the original filing). A deferred deduction has a follow-up action in a later filing year. An installment election spans years of dated reminders. After a save, an agent could put dated tasks directly on the user's calendar (Google Calendar, Outlook): "Second amendment due by [date]; §6511 window closes [date]." This extends the Handbook from a memory layer into a quiet operational partner, and brings real peace of mind. The calendar integration itself is well-trodden and not the hard part. Google Calendar is already a first-party Claude connector, so this becomes a tool-orchestration story, not a new integration. Out of scope for v1.
