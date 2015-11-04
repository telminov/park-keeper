# docker build -t telminov/park-keeper .
# sudo docker run --rm -ti telminov/park-keeper
FROM ubuntu:14.04
MAINTAINER telminov <telminov@soft-way.biz>

# web server port
EXPOSE 8080
# web scoket server
EXPOSE 8081

RUN apt-get update && apt-get install -y vim wget curl \
                        xz-utils \
                        build-essential \
                        libssl-dev openssl \
                        git

# install python 3
WORKDIR /tmp
RUN wget https://www.python.org/ftp/python/3.5.0/Python-3.5.0.tar.xz
RUN tar -xf Python-3.5.0.tar.xz
WORKDIR /tmp/Python-3.5.0
RUN ./configure
RUN make
RUN make install
RUN rm -rf /tmp/Python-3.5.0*

# install nodejs
RUN curl -sL https://deb.nodesource.com/setup | bash -
RUN apt-get install -y nodejs

# copy source
COPY . /opt/park-keeper
WORKDIR /opt/park-keeper

# install frontend
WORKDIR /opt/park-keeper/frontend
RUN npm install
RUN node_modules/.bin/bower install --allow-root --config.interactive=false
RUN node_modules/.bin/gulp build

# install backend
WORKDIR /opt/park-keeper/backend
RUN pip3 install -r requirements.txt

#