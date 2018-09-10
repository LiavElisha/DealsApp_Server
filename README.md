# seat4eat_server


### Update server 
 run `./updateTheServer.sh`
 ### Udpate certificate (for HTTPS connection)
 if not expired, 
 
 run `sudo certbot renew --dry-run` (if not working try stop server, run command, start server)

else -
1. stop server
2. run `./letsencrypt-auto renew --force-renewal --standalone --preferred-challenges http`
3. start server
