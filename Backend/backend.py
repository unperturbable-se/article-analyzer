from fastapi import FastAPI,Body
from fastapi.middleware.cors import CORSMiddleware
from language_analyzer import vectorize_documents, checkSimilarity, returnSimilarityMatrix, reset_vocabulary, get_topics#, getTopicCluster

app=FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Allows requests from your local HTML file
    allow_credentials=True,
    allow_methods=["*"],      # Explicitly allows OPTIONS, POST, GET, etc.
    allow_headers=["*"],      # Allows Content-Type and custom headers
)

@app.post("/vectorize")
def v0(documents: list[str]=Body(...)):
    return vectorize_documents(documents)

@app.post("/compare")
def v1(a:str=Body(...),b:str=Body(...)):
    return checkSimilarity(a,b)

@app.post("/compare_all")
def v2(vectors: list[list[float]]=Body(...)):
    m=returnSimilarityMatrix(vectors)
    return m

@app.post("/get_topics")
def v3(vectors: list[list[float]]=Body(...)):
    return get_topics(vectors)


#@app.post("/get_topic_clusters")
#def v4(vectors: list[list[float]]=Body(...)):
#    return getTopicCluster(vectors)

@app.post("/reset")
def v5():
    reset_vocabulary()