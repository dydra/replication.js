
#for file in $(find . | grep  .sh | grep GET) ; do  cat $file |grep -E '\-H' ; done //gets the -Hs

#for file in $(find . -type f -name \*GET*.sh) ; do echo $file ; echo ; cat $file | grep \\-H  ; cat $file | grep query | grep -Ev '^#' ; echo ; done ;

