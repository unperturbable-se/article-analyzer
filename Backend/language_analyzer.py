import requests
import math
import numpy as np
from nltk.corpus import wordnet as wn  

#tokenization
def tokenize(text):
  text=text.replace('-',' ')
  tokenized=[]
  for word in text.split():
    token=""
    for character in word:
      if character.isalpha():
        token+=character
    if token: tokenized.append(token)
  return tokenized


#remove stop words
stopwords_list = requests.get("https://gist.githubusercontent.com/larsyencken/1440509/raw/53273c6c202b35ef00194d06751d8ef630e53df2/stopwords.txt").content
stopwords = set(stopwords_list.decode().splitlines()[6:])


def remove_stop_words(tokenized):
  clean_tokenized=[]
  for token in tokenized:
    if token.lower() not in stopwords:
     clean_tokenized.append(token)
  return clean_tokenized


#hashing / vocabulary building
vocabulary={}
def expand_vocabulary(clean_tokenized):
  vocabulary.update(dict.fromkeys(clean_tokenized))
def hash_vocabulary():
  for [count,key] in enumerate(vocabulary):
   vocabulary[key]=count
def reset_vocabulary():
    vocabulary.clear()


#vectorization
def vectorize_tokens(clean_tokenized):
  vector=[0]*len(vocabulary)
  for word in clean_tokenized:
   if word in vocabulary:
     vector[vocabulary[word]]+=1
  return vector


#replacing each element of vector with tf*idf
def tfidf(vectors):
  length=len(vectors[0])
  numDocuments=len(vectors)
  for i in range(length):
    df=0
    for j in range(numDocuments):
      if vectors[j][i]>0:
        df+=1
    idf=math.log(numDocuments/df)
    if idf==0 : idf=1
    for j in range(numDocuments):
      vectors[j][i]*=idf

#-------------------------------------------------------------------
def vectorize_documents(documents):
    intermediate=[[]]*len(documents)
    for i in range(len(documents)):
      intermediate[i]=tokenize(documents[i])
      intermediate[i]=remove_stop_words(intermediate[i])
      expand_vocabulary(intermediate[i])
    hash_vocabulary()
    vectors=[[]]*len(documents)
    for i in range(len(documents)):
      vectors[i]=vectorize_tokens(intermediate[i])
    tfidf(vectors)
    return vectors
#-------------------------------------------------------------------

def checkSimilarity(v0,v1):
  dotProduct=np.dot(v0,v1)
  magnitude0=np.sqrt(np.sum(np.square(v0)))
  magnitude1=np.sqrt(np.sum(np.square(v1)))
  similarityScore=dotProduct/(magnitude0*magnitude1)
  return similarityScore

def printSimilarityMatrix(vectors):
    for i in range(len(vectors)):
        for j in range(len(vectors)):
            print("Comparing document ",i," with document ",j,":",end=" ")
            similarityScore=checkSimilarity(vectors[i],vectors[j])
            print(f"the documents are {similarityScore*100}% similar")

def returnSimilarityMatrix(vectors):
    matrix=[]
    for i in range(len(vectors)):
          arr=[]
          for j in range(len(vectors)):
              print("Comparing document ",i," with document ",j,":",end=" ")
              similarityScore=checkSimilarity(vectors[i],vectors[j])
              print(f"the documents are {similarityScore*100}% similar")
              arr.append(similarityScore)
          matrix.append(arr)
    
    return matrix
#-------------------------------------------------------------------
def find_root_word_helper(word1:str,word2:str)->str:
  synset1=wn.synset(word1,wn.NOUN)
  synset2=wn.synset(word2,wn.NOUN)
  common_hypernyms=synset1.lowest_common_hypernyms(synset2)
  hypernym=common_hypernyms[0]
  return hypernym

def find_root_word(words:list[str]):
  size=len(words)
  if(size>2):
    words=[find_root_word(words[0:size//2]),find_root_word(words[size//2:])]
  return find_root_word_helper(words[0],words[1])
  return 0
#-------------------------------------------------------------------
def get_topic(vector: np.array):
  top_indeces=np.argsort(vector)[::-1]
  top_indeces=top_indeces[0:min(5,len(top_indeces))]
  top_words=[]
  vocab_list=list(vocabulary.keys())
  for index in top_indeces:
    if(vector[index]>0):
      top_words.append(vocab_list[index])
  root_word=find_root_word(top_words)
  return{
      "Topic":root_word,
      "Top Keywords": top_words
  }

def get_topics(vectors: np.array(np.array)):
  output={
    "shared topic":[]
    "per document":[]
  }
  key_words=[]
  for vector in vectors:
    topic=get_topic(vector)
    output["per document"].append(topic)
    key_words.append(topic)
  output["shared topic"]=find_root_word(key_words)   
  return output

def getTopicClusters(vectors):
  pass
