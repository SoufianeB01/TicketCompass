
# TicketCompass

An AI-powered assistant that helps IT support teams efficiently assign tickets to the most suitable team members.

**Author:** Soufiane Boufarache  
**Email:** soufianeboufarache@gmail.com

## About TicketCompass

I developed TicketCompass to improve the way IT support teams assign tickets and make better use of existing experience within the team.

When someone resolves a ticket, they don't just deliver a solution, but also gain valuable experience that can be reused. TicketCompass uses this experience to recommend suitable team members for new tickets. This gives both the Scrum Master and the team a better overview of the available expertise, without employees having to point it out themselves.

## Features

- **Dashboard:** An overview of tickets, including their status and details.
- **Tickets:** View all tickets and their current status.
- **Ticket Details:** View and edit ticket information, including assigning employees and resolving tickets.
- **AI Analysis:** Analyzes a ticket, identifies the required skills and categorizes it.
- **AI Recommendations:** Recommends the top three suitable employees based on skills, previous experience and available capacity. A weighted scoring formula is used to rank them, which is explained further below.
- **Ticket Assignment:** Assign a ticket to a recommended employee or manually select another team member.
- **Employees:** An overview of team members, their skills and capacity.
- **Knowledge Base:** Organizes resolved tickets and their solutions using AI-generated categories, making previous experience easier to find and reuse.
- **Runtime Adaptation:** When a ticket is resolved, its solution becomes part of the available historical data. Future recommendations use this updated information, allowing the system to adapt as more tickets are resolved.

## Choices

### Backend – C# / ASP.NET Core

I chose C# and ASP.NET Core because I already have experience building APIs, connecting frontends to backends and working with this architecture. This allowed me to focus on the main goal of the assignment rather than spending time learning a new stack.

I used LiteLLM Proxy to connect my C# backend to different AI providers, while still making use of LiteLLM's Python-based functionality without having to build a separate Python backend.

### Frontend – React / TypeScript

I chose React and TypeScript because I have experience working with both. TypeScript helps catch errors during development through type checking, while React makes it easy to build and reuse components. I also used Material UI (MUI) to create a consistent interface without having to build every component from scratch.

### Data Storage – JSON

Initially, I planned to use PostgreSQL, but considering the expected development time of 3–4 hours, I decided to use JSON files instead. For this prototype, JSON is enough to demonstrate the functionality without spending too much time setting up a database.

I did create a database diagram in Figma to show how the different entities would relate to each other if I were to use a relational database.

### LLM Providers

I wanted TicketCompass to support different AI models, such as OpenAI, Claude and Gemini, rather than depending on a single provider. I was able to test Gemini using its free tier.

Since testing the AI functionality was important, I also added support for a local model through Ollama. This allowed me to continue testing without relying on API quotas and switch between providers through configuration.


## How AI Works

### AI Ticket Analysis

The AI analyzes the ticket's title and description to better understand the issue. It generates a summary, identifies the required skills and assigns a category. This information is also useful for organizing tickets in the Knowledge Base.

### AI Recommendations

Based on the ticket analysis, the AI evaluates employees by looking at their skills and experience from previously resolved tickets. Their available capacity is also taken into account.

The system uses a weighted scoring formula to rank employees and recommends the top three, including an explanation for each recommendation.

**Weighted Scoring Formula**

I used the [Weighted Sum Model](https://www.iapm.net/en/blog/weighted-sum-model/) to combine three factors:

Skills, Experience and Capacity

**Final Score = (0.50 × Skill Score) + (0.30 × Experience Score) + (0.20 × Capacity Score)**

I gave skills the highest weight because matching the technical requirements of a ticket is the most important factor. Experience comes next, since employees who have resolved similar issues may be better suited. Capacity is included to avoid overloading employees.

The AI determines the skill and experience scores, while the backend calculates the capacity score and final ranking.

## Assumptions

TicketCompass is intended as an addition to existing ticket management systems, rather than a replacement. For this prototype, I included features such as viewing and editing tickets to demonstrate the complete workflow. In practice, these features would likely already exist in the company's ticketing system, while TicketCompass would focus on AI analysis and employee recommendations.

For employee capacity, I kept things simple by assuming that each active ticket has the same workload. Capacity is calculated based on the number of active tickets compared to the employee's maximum capacity. In the future, story points could be used to account for differences in ticket complexity.

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd TicketCompass
```
or use Github Desktop

### 2. Configure the environment

Create a `.env` file in the root directory and copy the contents of `.env.example`.

Choose one of the following AI options.

### 3a. Cloud AI (OpenAI, Claude or Gemini)

Set your preferred provider in `.env`:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_api_key
```

You can also use `openai` or `claude` with their corresponding API keys. Model names can be changed in `.env`.

### 3b. Local AI (Ollama)

If you prefer running AI locally without an API key, install [Ollama](https://ollama.com/download).

Set the provider in `.env`:

```env
LLM_PROVIDER=ollama
```

Download the model:

```bash
ollama pull gemma3:4b
```

Make sure Ollama is running before starting TicketCompass.

### 4. Start TicketCompass

Make sure Docker Desktop is running. From the project root, execute:

```bash
docker compose up -d --build
```

Docker builds and starts the frontend, backend and LiteLLM containers, including their dependencies.

Check whether the containers are running:

```bash
docker compose ps
```

### 5. Open the application

Open **http://localhost:5174** in your browser to access the TicketCompass dashboard.

Other available services:

| Service | URL |
|---------|-----|
| Backend API | http://localhost:5069 |
| Swagger | http://localhost:5069/swagger |
| LiteLLM | http://localhost:4000 |

### Troubleshooting

If AI requests fail, check the LiteLLM logs:

```bash
docker compose logs litellm --tail=100
```


## References

- [Weighted Sum Model – IAPM](https://www.iapm.net/en/blog/weighted-sum-model/)
- [HttpClient – Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient)
- [LiteLLM Proxy Configuration](https://docs.litellm.ai/docs/proxy/configs)
