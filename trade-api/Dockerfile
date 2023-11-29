FROM debian:12

RUN apt-get update -qq \
    && apt-get install -qq --no-install-recommends \
      curl \
      dirmngr \
      unzip \
    && apt-get clean

COPY tools/docker-entrypoint.sh /usr/local/bin
COPY tools/bun-custom /usr/local/bin/bun

RUN groupadd bun \
      --gid 1000 \
    && useradd bun \
      --uid 1000 \
      --gid bun \
      --shell /bin/sh \
      --create-home \
    && ln -s /usr/local/bin/bun /usr/local/bin/bunx \
    && which bun \
    && which bunx \
    && bun --version

WORKDIR /home/bun/app

COPY package.json .
COPY dist/updater.js .

CMD ["bun", "run", "updater.js"]
