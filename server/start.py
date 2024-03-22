from src.main import * 

IMPORTANT_MESSAGE = '''
|============[KL-Server - v0.2.5]============|

If skybrush-server is not installed the 
program will install automatically.

Poetry is required for it to run.
[This may change in the future]

File structure should look like this:
(after install)

Root/
     skybrush-server/
     windows/
     src/
     .gitignore
     start.py

|===========================================|
'''

if __name__ == "__main__":
    print(IMPORTANT_MESSAGE)
    start()