pipeline {
    agent any

    environment {
        DEPLOY_DIR = '/home/ubuntu/flow-backend'
        COMPOSE_FILE = '/home/ubuntu/flow-backend/docker-compose.yml'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                dir('FLOW_Backend/backend') {
                    sh 'echo "WORKSPACE=$WORKSPACE"; ls -la "$WORKSPACE" || true'
                    sh 'echo "Building monolith..."'
                    sh "docker build -f ${env.WORKSPACE}/backend/Dockerfile --target monolith -t flow-monolith:${env.BUILD_TAG} -t flow-monolith:latest ${env.WORKSPACE}/backend || exit 1"

                    sh 'echo "Building gateway..."'
                    sh "docker build -f ${env.WORKSPACE}/backend/Dockerfile --target gateway -t flow-gateway:${env.BUILD_TAG} -t flow-gateway:latest ${env.WORKSPACE}/backend || exit 1"

                    sh 'echo "Building realtime..."'
                    sh "docker build -f ${env.WORKSPACE}/backend/Dockerfile --target realtime -t flow-realtime:${env.BUILD_TAG} -t flow-realtime:latest ${env.WORKSPACE}/backend || exit 1"

                    sh 'echo "All images built successfully"'
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('FLOW_Backend/backend') {
                    sh '''
                        mkdir -p ${DEPLOY_DIR}

                        cp docker-compose.yml ${DEPLOY_DIR}/
                        
                        if [ ! -f "${DEPLOY_DIR}/.env" ]; then
                            echo "==========================================="
                            echo "ERROR: ${DEPLOY_DIR}/.env not found!"
                            echo ""
                            echo "Create it once manually:"
                            echo "  cd ${DEPLOY_DIR}"
                            echo "  nano .env"
                            echo ""
                            echo "Required variables:"
                            echo "  INTERNAL_API_KEY, JWT_SECRET, CLOUDINARY_URL"
                            echo "==========================================="
                            exit 1
                        fi
                        
                        cd ${DEPLOY_DIR}
                        docker-compose -f docker-compose.yml -p flow-backend down --remove-orphans || true
                        docker-compose -f docker-compose.yml -p flow-backend up -d
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sleep(time: 20, unit: 'SECONDS')

                    def maxRetries = 12
                    def retry = 0
                    def allHealthy = true

                    // Check Gateway
                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Gateway: HEALTHY"
                            break
                        }
                        retry++
                        println "Gateway check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Gateway health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs gateway --tail 50 || true'
                        allHealthy = false
                    }

                    // Check Monolith
                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Monolith: HEALTHY"
                            break
                        }
                        retry++
                        println "Monolith check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Monolith health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs monolith --tail 50 || true'
                        allHealthy = false
                    }

                    // Check Realtime
                    retry = 0
                    while (retry < maxRetries) {
                        def code = sh(script: 'curl -sf -o /dev/null -w "%{http_code}" http://localhost:3005/health || true', returnStdout: true).trim()
                        if (code == '200') {
                            println "Realtime: HEALTHY"
                            break
                        }
                        retry++
                        println "Realtime check ${retry}/${maxRetries}..."
                        sleep(5)
                    }
                    if (retry == maxRetries) {
                        println "Realtime health check FAILED"
                        sh 'docker-compose -f ${COMPOSE_FILE} -p flow-backend logs realtime --tail 50 || true'
                        allHealthy = false
                    }

                    if (!allHealthy) {
                        error("One or more services failed health check")
                    }

                    println 'All services healthy!'
                }
            }
        }
    }

    post {
        always {
            sh '''
                docker rmi flow-monolith:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-gateway:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-realtime:${BUILD_TAG} 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
            '''
        }
        success {
            echo """
            ==========================================
            SUCCESS! Build: ${BUILD_TAG}
            ==========================================
            Gateway:  http://YOUR_EC2_IP:3000
            Realtime: http://YOUR_EC2_IP:3005
            ==========================================
            """
        }
        failure {
            echo """
            ==========================================
            FAILED! Build: ${BUILD_TAG}
            Check logs above for errors.
            Common fixes:
            - Missing .env file? Create at /home/ubuntu/flow-backend/.env
            - Docker not installed? sudo apt install docker.io docker-compose
            ==========================================
            """
        }
    }
}