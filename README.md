# park-keeper
Django project for application django-park-keeper

## starting
```
mkdir -p /var/docker/park-keeper/conf
mkdir -p /var/docker/park-keeper/db
```

## Development
```
cd ~/development/github
git clone https://github.com/telminov/park-keeper.git
git clone https://github.com/telminov/django-park-keeper.git
git clone https://github.com/telminov/park-worker-base.git
git clone https://github.com/telminov/park-worker-p2.git
git clone https://github.com/telminov/park-worker-p3.git


cat >> ~/.bashrc 
# park-keeper packages
export PYTHONPATH="${PYTHONPATH}:~/development/github/django-park-keeper"
export PYTHONPATH="${PYTHONPATH}:~/development/github/park-worker-base"
export PYTHONPATH="${PYTHONPATH}:~/development/github/park-worker-p2"
export PYTHONPATH="${PYTHONPATH}:~/development/github/park-worker-p3"

source ~/.bashrc 

cd park-keeper/backend
cp project/settings.sample.py project/settings.py
# you may need correct MONGODB and DATABASES settings


virtualenv -p python3.5 virt_env
source virt_env/bin/activate
pip3 install -r requirements.txt
./manage.py migrate
./manage.py createsuperuser


cd ../frontend
npm install
node_modules/bower/bin/bower install

# Starting frontend:
node_modules/.bin/gulp watch
# Starting backend:
./manage.py runserver
./manage.py process_events
./manage.py generate_tasks
./manage.py collect_results
./manage.py process_workers
./manage.py ahttp

# park-worker-p3
cd ~/development/github/park-worker-p3
pip install -e .
cd parkworker3/
cp project/settings.sample.py project/settings.py
# you may need correct ZMQ_SERVER_ADDRESS
bin/start_workers.py

```


## Docker compose
```
docker start mongo3 mysql
docker-compose up
```



