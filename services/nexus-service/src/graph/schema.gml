graph TD
    subgraph Nodes
        Covenant["Covenant (License/Agreement)"]
        Article["Article (Blog Post/Content)"]
        Author["Author (Creator/Owner)"]
        Concept["Concept (Core Idea/Technology)"]
    end

    subgraph Edges
        CITES["CITES"]
        EXPOUNDS_ON["EXPOUNDS_ON"]
        AUTHORED_BY["AUTHORED_BY"]
    end

    %% Relationships based on the project context (AI Banking License Expansion Series)

    %% Author to Content
    Author -- AUTHORED_BY --> Article

    %% Content to Core Ideas
    Article -- EXPOUNDS_ON --> Concept

    %% Covenant/License Structure
    Covenant -- EXPOUNDS_ON --> Concept
    Article -- CITES --> Covenant

    %% Example of a specific flow based on the narrative:
    Author -- AUTHORED_BY --> Covenant
    Article -- EXPOUNDS_ON --> Covenant
    Concept -- EXPOUNDS_ON --> Covenant

    %% Styling for clarity (Optional, but good for GML visualization)
    classDef entity fill:#f9f,stroke:#333,stroke-width:2px;
    class Covenant,Article,Author,Concept entity;
    classDef relationship stroke:#00f,stroke-width:1px,color:#00f;
    class CITES,EXPOUNDS_ON,AUTHORED_BY relationship;